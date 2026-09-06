import { describe, it, expect, vi, afterEach } from 'vitest'
import pg from 'pg'
import { getTableName, getTableColumns } from 'drizzle-orm'
import { migrate, STATEMENTS, describeError } from '@jobdekho/db/migrate.js'
import { CREATE_TABLES } from '@jobdekho/db/create-tables.js'
import * as schema from '@jobdekho/db/schema.js'

// A failure that never reached Postgres - see retry.js for where this shape
// was read off the installed pg source.
function connectionError() {
  return Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), {
    code: 'ECONNREFUSED', errno: -111, syscall: 'connect',
  })
}

describe('migrate', () => {
  it('runs every statement in order against the given sql client', async () => {
    const calls = []
    const fakeSql = async (stmt) => { calls.push(stmt) }
    const count = await migrate(fakeSql, ['a', 'b'])
    expect(calls).toEqual(['a', 'b'])
    expect(count).toBe(2)
  })

  // A run that fails partway and is retried must not error on statements it
  // already applied, which is only true if every DDL statement guards itself.
  it('keeps every DDL statement additive and idempotent', () => {
    const ddl = STATEMENTS.filter((s) => /^(alter table|create index|create table)/i.test(s))
    expect(ddl.length).toBeGreaterThan(0)
    for (const s of ddl) expect(s.toLowerCase()).toContain('if not exists')
  })

  // A fresh Postgres volume has no tables at all, so the bootstrap has to be
  // complete on its own: every table the ORM knows, with every column, or the
  // first query after boot fails on a missing relation or column. Checked
  // against schema.js so a column added there without a matching line here
  // fails this test rather than the container's first request.
  it('creates every table and column in schema.js so a fresh database bootstraps from this file alone', () => {
    const tables = Object.values(schema).filter((t) => typeof t === 'object' && getTableName(t))
    expect(tables.length).toBeGreaterThan(0)
    for (const table of tables) {
      const name = getTableName(table)
      const statement = CREATE_TABLES.find((s) => s.startsWith(`create table if not exists ${name} (`))
      expect(statement, `no create statement for ${name}`).toBeDefined()
      for (const column of Object.values(getTableColumns(table))) {
        expect(statement, `${name}.${column.name} missing`).toMatch(new RegExp(`^\\s*${column.name} `, 'm'))
      }
    }
  })

  // The alters would fail on a fresh database if their tables did not yet
  // exist, so the create statements must run first.
  it('creates the base tables before altering them', () => {
    const lastCreate = STATEMENTS.findLastIndex((s) => s.startsWith('create table'))
    const firstAlter = STATEMENTS.findIndex((s) => s.startsWith('alter table'))
    expect(lastCreate).toBeGreaterThanOrEqual(0)
    expect(firstAlter).toBeGreaterThan(lastCreate)
  })

  it('adds the currency column so a re-scrape can store what core detects', () => {
    expect(STATEMENTS).toContain('alter table postings add column if not exists currency text')
  })

  // Nullable and unbackfilled by design: the full text was never stored, so
  // only a re-scrape can fill it and old rows must be allowed to stay NULL.
  it('adds the description_text column the ranking scores against', () => {
    expect(STATEMENTS).toContain('alter table postings add column if not exists description_text text')
  })

  // Built DESC NULLS LAST to match orderFor()'s "newest" clause exactly, since
  // that is the fallback sort for most page loads.
  it('indexes posted_at to match the default "newest" sort ordering', () => {
    expect(STATEMENTS).toContain(
      'create index if not exists postings_posted_at_idx on postings (posted_at desc nulls last)',
    )
  })

  // source is filtered on directly and is the only high-cardinality column
  // among the filterable ones (level/degree_min/work_mode top out at 3-6 values).
  it('indexes source for the source filter and the per-source dashboard counts', () => {
    expect(STATEMENTS).toContain('create index if not exists postings_source_idx on postings (source)')
  })

  describe('connection retry', () => {
    afterEach(() => vi.useRealTimers())

    // The first statement of a run lands on a database that is not accepting
    // connections yet. It must be retried in place, not skipped, and every
    // later statement still has to run.
    it('retries a statement that hits a connection failure, then continues the run', async () => {
      vi.useFakeTimers()
      const calls = []
      let aAttempts = 0
      const fakeSql = async (stmt) => {
        calls.push(stmt)
        if (stmt === 'a') {
          aAttempts += 1
          if (aAttempts === 1) throw connectionError()
        }
      }
      const result = migrate(fakeSql, ['a', 'b'])
      await vi.runAllTimersAsync()
      expect(await result).toBe(2)
      expect(calls).toEqual(['a', 'a', 'b'])
    })

    it('propagates a genuine SQL error without retrying, and stops the run there', async () => {
      const err = new pg.DatabaseError('syntax error at or near "FROM"', 0, 'error')
      err.code = '42601'
      const calls = []
      const fakeSql = async (stmt) => {
        calls.push(stmt)
        if (stmt === 'a') throw err
      }
      await expect(migrate(fakeSql, ['a', 'b'])).rejects.toBe(err)
      expect(calls).toEqual(['a'])
    })
  })
})

describe('describeError', () => {
  // The raw driver message ("connect ECONNREFUSED 127.0.0.1:5432") names no
  // next step - this is what replaces it.
  it('tells the operator to check Postgres is running for a connection failure', () => {
    const message = describeError(connectionError())
    expect(message).toMatch(/could not reach the database/i)
    expect(message).toMatch(/docker compose up db/)
    expect(message).toContain('ECONNREFUSED')
  })

  // A refused `localhost` arrives as an AggregateError with an empty message;
  // the first run of this printed "after 5 attempts ()" and named nothing.
  it('names the inner error when the connection failure is an empty-message AggregateError', () => {
    const inner = connectionError()
    const err = new AggregateError([inner, connectionError()], '')
    err.code = 'ECONNREFUSED'
    const message = describeError(err)
    expect(message).not.toContain('()')
    expect(message).toContain(inner.message)
  })

  it('passes a SQL error message through unchanged, since it is not a connectivity problem', () => {
    const err = new Error('syntax error at or near "FROM"')
    expect(describeError(err)).toBe(err.message)
  })
})
