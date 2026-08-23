import { describe, it, expect } from 'vitest'
import {
  normalizePrefs, normalizeFilters, applyStatusFilter, listPostingsForUser,
} from '@jobdekho/db/dashboard.js'

// Records the chain calls listPostingsForUser makes and resolves to `rows`.
function fakeDb(rows = []) {
  const calls = { limit: undefined, offset: undefined, columns: undefined, where: undefined }
  const chain = {
    // Only the inner select names columns; the outer one reads the subquery.
    select: (columns) => { if (columns) calls.columns = columns; return chain },
    from: () => chain,
    leftJoin: () => chain,
    where: (w) => { calls.where = calls.where ?? w; return chain },
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
    const { db } = fakeDb([
      { id: '1', status: undefined }, { id: '2', status: 'saved' },
    ])
    expect(await listPostingsForUser(db, 'u1')).toEqual([
      { id: '1', status: null, groupCount: 1, matchScore: 0 }, { id: '2', status: 'saved', groupCount: 1, matchScore: 0 },
    ])
    const { db: db2 } = fakeDb([{ id: '1', status: undefined }, { id: '2', status: 'saved' }])
    expect(await listPostingsForUser(db2, 'u1', { status: 'saved' })).toEqual([
      { id: '2', status: 'saved', groupCount: 1, matchScore: 0 },
    ])
  })
})
