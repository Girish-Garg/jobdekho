import { describe, it, expect } from 'vitest'
import { applyStatusFilter, listPostingsForUser } from '@jobdekho/db/dashboard.js'
import { normalizePrefs, normalizeFilters } from '@jobdekho/db/dashboard-prefs.js'

// Records the chain calls listPostingsForUser makes and resolves to `rows`.
// A ranked call issues the rarity scan first, so `columns` keeps the LAST
// non-empty selection (the ranked page's) and `selects` keeps them all.
function fakeDb(rows = []) {
  const calls = {
    limit: undefined, offset: undefined, columns: undefined, where: undefined,
    wheres: [], selects: [],
  }
  const chain = {
    // Only the inner select names columns; the outer one reads the subquery.
    select: (columns) => {
      if (columns) { calls.columns = columns; calls.selects.push(columns) }
      return chain
    },
    from: () => chain,
    leftJoin: () => chain,
    where: (w) => { calls.where = calls.where ?? w; calls.wheres.push(w); return chain },
    orderBy: (o) => { calls.orderBy = o; return chain },
    // The real query ranks in a subquery, so .as() closes the inner select and
    // the outer one starts again from .select().
    as: () => chain,
    limit: (n) => { calls.limit = n; return chain },
    offset: (n) => { calls.offset = n; return chain },
    then: (resolve) => resolve(rows),
  }
  return { db: chain, calls }
}

describe('normalizePrefs', () => {
  it('fills all defaults when called with empty object', () => {
    const p = normalizePrefs({})
    expect(p.channel).toBe('none')
    expect(p.telegramChatId).toBeNull()
    expect(p.enabled).toBe(true)
  })
  it('preserves provided values over defaults', () => {
    const p = normalizePrefs({ channel: 'telegram', telegramChatId: '123', enabled: false })
    expect(p.channel).toBe('telegram')
    expect(p.telegramChatId).toBe('123')
    expect(p.enabled).toBe(false)
  })
  it('handles null input gracefully', () => {
    const p = normalizePrefs(null)
    expect(p.channel).toBe('none')
    expect(p.enabled).toBe(true)
  })
})

describe('normalizeFilters', () => {
  it('fills all array defaults when called with empty object', () => {
    const f = normalizeFilters({})
    expect(f.includeKeywords).toEqual([])
    expect(f.excludeKeywords).toEqual([])
    expect(f.locations).toEqual([])
    expect(f.levels).toEqual([])
  })
  it('defaults every scalar field to null', () => {
    const f = normalizeFilters({})
    expect(f.maxDegree).toBeNull()
    expect(f.minStipend).toBeNull()
    expect(f.maxDurationMonths).toBeNull()
    expect(f.maxExperienceYears).toBeNull()
  })
  it('preserves provided arrays', () => {
    const f = normalizeFilters({ includeKeywords: ['react'], locations: ['remote'] })
    expect(f.includeKeywords).toEqual(['react'])
    expect(f.excludeKeywords).toEqual([])
    expect(f.locations).toEqual(['remote'])
  })
  it('preserves the level and degree fields', () => {
    const f = normalizeFilters({ levels: ['entry', 'mid'], maxDegree: 'bachelors' })
    expect(f.levels).toEqual(['entry', 'mid'])
    expect(f.maxDegree).toBe('bachelors')
  })
  it('preserves the numeric ceilings, including zero', () => {
    const f = normalizeFilters({ minStipend: 0, maxDurationMonths: 6, maxExperienceYears: 2 })
    expect(f.minStipend).toBe(0)
    expect(f.maxDurationMonths).toBe(6)
    expect(f.maxExperienceYears).toBe(2)
  })
  it('drops keys it does not own', () => {
    const f = normalizeFilters({ userId: 'u1', updatedAt: new Date(), locations: ['pune'] })
    expect(Object.keys(f).sort()).toEqual([
      'excludeKeywords', 'excludedSources', 'includeKeywords', 'levels', 'locations',
      'maxDegree', 'maxDurationMonths', 'maxExperienceYears', 'minStipend', 'sources', 'workModes',
    ])
  })
  it('handles null input gracefully', () => {
    const f = normalizeFilters(null)
    expect(f.includeKeywords).toEqual([])
    expect(f.excludeKeywords).toEqual([])
    expect(f.locations).toEqual([])
    expect(f.levels).toEqual([])
    expect(f.maxDegree).toBeNull()
  })
  it('does not mutate its input', () => {
    const input = { locations: ['pune'] }
    normalizeFilters(input)
    expect(input).toEqual({ locations: ['pune'] })
  })
})

describe('applyStatusFilter', () => {
  const mockRows = [
    { id: 1, status: undefined },
    { id: 2, status: null },
    { id: 3, status: 'saved' },
    { id: 4, status: 'applied' },
    { id: 5, status: 'dismissed' },
  ]

  it('normalizes and returns all rows when status is undefined', () => {
    const result = applyStatusFilter(mockRows, undefined)
    expect(result).toHaveLength(5)
    expect(result[0].status).toBe(null)
    expect(result[1].status).toBe(null)
    expect(result[2].status).toBe('saved')
    expect(result[3].status).toBe('applied')
    expect(result[4].status).toBe('dismissed')
  })

  it('filters to only unactioned rows when status is null', () => {
    const result = applyStatusFilter(mockRows, null)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe(1)
    expect(result[1].id).toBe(2)
    expect(result.every((r) => r.status === null)).toBe(true)
  })

  it('filters to only saved rows when status is "saved"', () => {
    const result = applyStatusFilter(mockRows, 'saved')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(3)
    expect(result[0].status).toBe('saved')
  })

  it('filters to only applied rows when status is "applied"', () => {
    const result = applyStatusFilter(mockRows, 'applied')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(4)
    expect(result[0].status).toBe('applied')
  })

  it('filters to only dismissed rows when status is "dismissed"', () => {
    const result = applyStatusFilter(mockRows, 'dismissed')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(5)
    expect(result[0].status).toBe('dismissed')
  })

  it('returns empty array when filtering for non-existent status', () => {
    const result = applyStatusFilter(mockRows, 'nonexistent')
    expect(result).toHaveLength(0)
  })

  it('preserves other row properties during normalization', () => {
    const rowsWithExtra = [{ id: 1, title: 'Test', status: undefined }]
    const result = applyStatusFilter(rowsWithExtra, undefined)
    expect(result[0].id).toBe(1)
    expect(result[0].title).toBe('Test')
    expect(result[0].status).toBe(null)
  })
})

describe('listPostingsForUser', () => {
  it('applies the default page size instead of pulling every row', async () => {
    const { db, calls } = fakeDb()
    await listPostingsForUser(db, 'u1')
    expect(calls.limit).toBe(500)
    expect(calls.offset).toBe(0)
  })

  it('honours an explicit limit and offset', async () => {
    const { db, calls } = fakeDb()
    await listPostingsForUser(db, 'u1', { limit: 20, offset: 40 })
    expect(calls.limit).toBe(20)
    expect(calls.offset).toBe(40)
  })

  it('clamps an oversized limit to the maximum', async () => {
    const { db, calls } = fakeDb()
    await listPostingsForUser(db, 'u1', { limit: 100000 })
    expect(calls.limit).toBe(1000)
  })

  it('selects the level and degree columns', async () => {
    const { db, calls } = fakeDb()
    await listPostingsForUser(db, 'u1')
    expect(calls.columns).toHaveProperty('level')
    expect(calls.columns).toHaveProperty('degreeMin')
    expect(calls.columns).toHaveProperty('degreeRequired')
    expect(calls.columns).toHaveProperty('type')
  })

  // groupSourceCount is scaffolding for ghost detection's blast signal, like
  // groupRank is scaffolding for the group pick - selected so core can read
  // it, but not a field the returned posting carries.
  it('selects groupSourceCount but strips it before it reaches the caller', async () => {
    const { db, calls } = fakeDb([{ id: '1', status: undefined }])
    const [posting] = await listPostingsForUser(db, 'u1')
    expect(calls.columns).toHaveProperty('groupSourceCount')
    expect('groupSourceCount' in posting).toBe(false)
  })

  // Freshness and the group-rank pick are both applied by default, so "nothing
  // filtered" now means opting out of each.
  it('passes no WHERE clause when nothing is filtered', async () => {
    const { db, calls } = fakeDb()
    await listPostingsForUser(db, 'u1', { includeStale: true, group: false })
    expect(calls.where).toBeUndefined()
  })

  it('filters stale rows and picks one row per group by default', async () => {
    const { db, calls } = fakeDb()
    await listPostingsForUser(db, 'u1')
    expect(calls.where).toBeDefined()
  })

  it('builds a WHERE clause once levels or maxDegree are given', async () => {
    const { db, calls } = fakeDb()
    await listPostingsForUser(db, 'u1', { levels: ['senior'], maxDegree: 'masters' })
    expect(calls.where).toBeDefined()
  })

  it('narrows the query when a status is asked for', async () => {
    const { db, calls } = fakeDb()
    await listPostingsForUser(db, 'u1', { status: 'saved' })
    expect(calls.where).toBeDefined()
    const { db: db2, calls: calls2 } = fakeDb()
    await listPostingsForUser(db2, 'u1', { status: null })
    expect(calls2.where).toBeDefined()
  })

  it('normalizes row status and keeps the JS filter as a backstop', async () => {
    // Neither row states a stipend, so ghost detection's one honest signal
    // ("no pay stated") rides along on the unranked path too.
    const ghost = { legitimacy: 'medium', ghostSignals: ['no pay stated'] }
    const { db } = fakeDb([
      { id: '1', status: undefined }, { id: '2', status: 'saved' },
    ])
    expect(await listPostingsForUser(db, 'u1')).toEqual([
      { id: '1', status: null, groupCount: 1, matchScore: 0, ...ghost },
      { id: '2', status: 'saved', groupCount: 1, matchScore: 0, ...ghost },
    ])
    const { db: db2 } = fakeDb([{ id: '1', status: undefined }, { id: '2', status: 'saved' }])
    expect(await listPostingsForUser(db2, 'u1', { status: 'saved' })).toEqual([
      { id: '2', status: 'saved', groupCount: 1, matchScore: 0, ...ghost },
    ])
  })
})

describe('listPostingsForUser when ranking', () => {
  const profile = { skills: ['react'], years: 0 }
  const row = {
    id: '1', title: 'React Developer', level: 'entry', degreeMin: 'none',
    descriptionSnippet: 'short', descriptionText: 'we use react daily', status: undefined,
  }

  it('adds fit and reasons to each posting, computed by core', async () => {
    const { db } = fakeDb([{ ...row }])
    const [posting] = await listPostingsForUser(db, 'u1', { sort: 'match', profile })
    // Skills, level and degree all fit perfectly, and titles were never stated,
    // so the incomplete profile still reaches 100 rather than being capped.
    expect(posting.fit).toBe(100)
    expect(posting.reasons).toContain('matches react')
  })

  // 4000 characters times a page of rows must not ride to the browser just to
  // justify a number - the reasons already carry the justification. Ghost
  // detection reads the same field for its thin-JD signal, so it has to be
  // stripped on the unranked path too, not only the ranked one.
  it('never lets descriptionText survive into a returned posting, ranked or not', async () => {
    const { db } = fakeDb([{ ...row }, { ...row, id: '2', descriptionText: null }])
    const ranked = await listPostingsForUser(db, 'u1', { sort: 'match', profile })
    for (const p of ranked) expect('descriptionText' in p).toBe(false)
    const { db: db2 } = fakeDb([{ ...row }])
    const unranked = await listPostingsForUser(db2, 'u1')
    for (const p of unranked) expect('descriptionText' in p).toBe(false)
  })

  // Ghost detection's thin-JD signal needs the full text, and that signal has
  // to fire on every feed, so the column can no longer be conditional on
  // whether ranking is active.
  it('selects descriptionText on every feed, ranked or not', async () => {
    const ranked = fakeDb()
    await listPostingsForUser(ranked.db, 'u1', { sort: 'match', profile })
    expect(ranked.calls.columns).toHaveProperty('descriptionText')
    const unranked = fakeDb()
    await listPostingsForUser(unranked.db, 'u1')
    expect(unranked.calls.columns).toHaveProperty('descriptionText')
  })

  // legitimacy and ghostSignals need no profile, so an unranked feed still
  // carries them - only fit, reasons, grade and breakdown wait on ranking.
  it('carries legitimacy and ghostSignals on an unranked feed', async () => {
    const { db } = fakeDb([{ ...row }])
    const [posting] = await listPostingsForUser(db, 'u1')
    expect(posting.legitimacy).toBeDefined()
    expect(Array.isArray(posting.ghostSignals)).toBe(true)
  })

  it('adds grade and breakdown, derived from the same fit, only when ranking', async () => {
    const { db } = fakeDb([{ ...row }])
    const [posting] = await listPostingsForUser(db, 'u1', { sort: 'match', profile })
    expect(posting.grade).toBeDefined()
    expect(posting.breakdown.length).toBeGreaterThan(0)
  })

  it('issues the rarity scan before the page query, and only when ranking', async () => {
    const ranked = fakeDb()
    await listPostingsForUser(ranked.db, 'u1', { sort: 'match', profile })
    expect(Object.keys(ranked.calls.selects[0])).toEqual(['total', 'df0'])
    const unranked = fakeDb()
    await listPostingsForUser(unranked.db, 'u1')
    expect(unranked.calls.selects.some((s) => 'df0' in s)).toBe(false)
  })

  it('leaves unranked postings without fit, reasons, grade or breakdown', async () => {
    const { db } = fakeDb([{ ...row }])
    const [posting] = await listPostingsForUser(db, 'u1')
    expect('fit' in posting).toBe(false)
    expect('reasons' in posting).toBe(false)
    expect('grade' in posting).toBe(false)
    expect('breakdown' in posting).toBe(false)
  })
})

// group:false and includeStale:true silence every other condition, so any
// WHERE that remains can only have come from the fit floor.
describe('the minFit floor', () => {
  const bare = { group: false, includeStale: true, minFit: 60 }
  const gates = (calls) => calls.wheres.filter(Boolean)

  it('filters the ranked feed on the outer select', async () => {
    const { db, calls } = fakeDb()
    await listPostingsForUser(db, 'u1', { ...bare, sort: 'match', profile: { skills: ['react'] } })
    expect(gates(calls)).toHaveLength(1)
  })

  // Without ranking every row "scores" zero, so honouring the floor would
  // empty the feed rather than filter it.
  it('is ignored when ranking is off, and when the profile cannot rank', async () => {
    const plain = fakeDb()
    await listPostingsForUser(plain.db, 'u1', { ...bare })
    expect(gates(plain.calls)).toHaveLength(0)
    const empty = fakeDb()
    await listPostingsForUser(empty.db, 'u1', { ...bare, sort: 'match', profile: {} })
    expect(gates(empty.calls)).toHaveLength(0)
  })

  it('treats zero and junk as no floor at all', async () => {
    const zero = fakeDb()
    await listPostingsForUser(zero.db, 'u1',
      { ...bare, minFit: 0, sort: 'match', profile: { skills: ['react'] } })
    expect(gates(zero.calls)).toHaveLength(0)
    const junk = fakeDb()
    await listPostingsForUser(junk.db, 'u1',
      { ...bare, minFit: 'high', sort: 'match', profile: { skills: ['react'] } })
    expect(gates(junk.calls)).toHaveLength(0)
  })
})
