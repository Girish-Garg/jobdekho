import { describe, it, expect, vi, afterEach } from 'vitest'
import { NeonDbError } from '@neondatabase/serverless'
import { migrate, STATEMENTS, describeError } from '@jobdekho/db/migrate.js'

// A failure that never reached Postgres - see retry.js for where this shape
// was read off the installed @neondatabase/serverless source.
function connectionError() {
  const err = new NeonDbError('Error connecting to database: fetch failed')
  err.sourceError = new TypeError('fetch failed')
  return err
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

  describe('cold-start retry', () => {
    afterEach(() => vi.useRealTimers())

    // This is the exact failure the user hit: the first statement of a run
    // lands on a suspended compute. It must be retried in place, not skipped,
    // and every later statement still has to run.
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
      const err = new NeonDbError('syntax error at or near "FROM"')
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
  // The original driver message ("Error connecting to database: fetch
  // failed") named neither a cause nor a next step - this is what replaces it.
  it('names the Neon cold-start cause for a connection failure', () => {
    const message = describeError(connectionError())
    expect(message).toMatch(/could not reach the database/i)
    expect(message).toMatch(/wake/i)
  })

  it('passes a SQL error message through unchanged, since it is not a connectivity problem', () => {
    const err = new Error('syntax error at or near "FROM"')
    expect(describeError(err)).toBe(err.message)
  })
})
