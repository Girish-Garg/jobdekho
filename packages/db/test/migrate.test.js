import { describe, it, expect } from 'vitest'
import { migrate, STATEMENTS } from '@jobdekho/db/migrate.js'

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
})
