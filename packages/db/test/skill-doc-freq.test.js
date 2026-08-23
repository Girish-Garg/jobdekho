import { describe, it, expect, vi, afterEach } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import { skillPatternSource } from '@jobdekho/core/fit-dimensions.js'
import { skillDocFreq } from '@jobdekho/db/skill-doc-freq.js'

const dialect = new PgDialect()

// Records every select's columns and resolves each query to the given row.
function fakeDb(row = { total: '3', df0: '2', df1: '1' }) {
  const selects = []
  const db = { select: (columns) => { selects.push(columns); return { from: () => Promise.resolve([row]) } } }
  return { db, selects }
}

afterEach(() => vi.useRealTimers())

describe('skillDocFreq', () => {
  it('answers for every skill in one scan: a filtered count each, plus the total', async () => {
    const { db, selects } = fakeDb()
    const result = await skillDocFreq(db, ['react', 'node'])
    expect(selects).toHaveLength(1)
    expect(Object.keys(selects[0])).toEqual(['total', 'df0', 'df1'])
    expect(result).toEqual({ docFreq: { react: 2, node: 1 }, totalDocs: 3 })
  })

  // The count and the scorer must agree on what "mentions" means, or rarity is
  // measured against a different corpus than the one scoring pays out on. That
  // means the core-built pattern, and the same snippet fallback for the body.
  it('counts with the pattern core builds, against title or the coalesced body', async () => {
    const { db, selects } = fakeDb({ total: '3', df0: '2' })
    await skillDocFreq(db, ['c++'])
    const { sql, params } = dialect.sqlToQuery(selects[0].df0)
    expect(sql).toContain('count(*) filter')
    expect(sql).toContain('coalesce("postings"."description_text", "postings"."description_snippet")')
    expect(params).toContain(skillPatternSource('c++', '\\y', '\\y'))
    expect(params).toContain('\\yc\\+\\+')
  })

  it('asks the database nothing for a profile with no skills', async () => {
    const { db, selects } = fakeDb()
    expect(await skillDocFreq(db, [])).toEqual({ docFreq: {}, totalDocs: 0 })
    expect(selects).toHaveLength(0)
  })

  // One scan per feed request would be paid by every page load for a corpus
  // that changes once a day, so the answer is held for a while.
  it('serves a repeat of the same skill set from cache, whatever its order', async () => {
    const { db, selects } = fakeDb()
    const first = await skillDocFreq(db, ['react', 'node'])
    const again = await skillDocFreq(db, ['node', 'react'])
    expect(selects).toHaveLength(1)
    expect(again.totalDocs).toBe(first.totalDocs)
  })

  it('scans again for a different skill set', async () => {
    const { db, selects } = fakeDb()
    await skillDocFreq(db, ['react', 'node'])
    await skillDocFreq(db, ['react', 'python'])
    expect(selects).toHaveLength(2)
  })

  it('expires a cached answer after the TTL', async () => {
    vi.useFakeTimers()
    const { db, selects } = fakeDb()
    await skillDocFreq(db, ['react', 'node'])
    vi.advanceTimersByTime(11 * 60 * 1000)
    await skillDocFreq(db, ['react', 'node'])
    expect(selects).toHaveLength(2)
  })

  // The cache is keyed per db handle, so one connection's answers (or a test's
  // fakes) never leak into another's.
  it('keeps separate db handles separately cached', async () => {
    const a = fakeDb({ total: '10', df0: '5' })
    const b = fakeDb({ total: '20', df0: '1' })
    expect((await skillDocFreq(a.db, ['react'])).totalDocs).toBe(10)
    expect((await skillDocFreq(b.db, ['react'])).totalDocs).toBe(20)
    expect(a.selects).toHaveLength(1)
    expect(b.selects).toHaveLength(1)
  })

  // Rarity is a refinement, not a requirement: the feed must degrade to an
  // unweighted ranking, not to a 500, and must retry rather than cache the miss.
  it('returns empty on a failed query, and does not cache the failure', async () => {
    let fail = true
    const selects = []
    const db = {
      select: (columns) => {
        selects.push(columns)
        return { from: () => (fail ? Promise.reject(new Error('boom')) : Promise.resolve([{ total: '3', df0: '2' }])) }
      },
    }
    expect(await skillDocFreq(db, ['react'])).toEqual({ docFreq: {}, totalDocs: 0 })
    fail = false
    expect(await skillDocFreq(db, ['react'])).toEqual({ docFreq: { react: 2 }, totalDocs: 3 })
    expect(selects).toHaveLength(2)
  })
})
