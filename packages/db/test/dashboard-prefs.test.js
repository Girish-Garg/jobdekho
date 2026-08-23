import { describe, it, expect } from 'vitest'
import { getUserFilters, upsertUserFilters, listUsersForNotify } from '@jobdekho/db/dashboard-prefs.js'

function selectDb(...results) {
  const queue = [...results]
  return { select: () => ({ from: () => ({ where: () => queue.shift() ?? [] }) }) }
}

function insertDb() {
  const calls = {}
  const db = {
    insert: () => ({
      values: (v) => {
        calls.values = v
        return { onConflictDoUpdate: (o) => { calls.set = o.set } }
      },
    }),
  }
  return { db, calls }
}

const ROW = {
  userId: 'u1', updatedAt: new Date(),
  includeKeywords: ['react'], excludeKeywords: ['sales'], locations: ['pune'],
  levels: ['entry', 'mid'], maxDegree: 'bachelors',
  minStipend: 15000, maxDurationMonths: 6, maxExperienceYears: 2,
}

describe('getUserFilters', () => {
  it('returns null when the user has saved no filters', async () => {
    expect(await getUserFilters(selectDb([]), 'u1')).toBeNull()
  })

  it('round-trips every persisted field', async () => {
    const f = await getUserFilters(selectDb([ROW]), 'u1')
    expect(f).toEqual({
      includeKeywords: ['react'], excludeKeywords: ['sales'], locations: ['pune'],
      levels: ['entry', 'mid'], sources: [], excludedSources: [], workModes: [], maxDegree: 'bachelors',
      minStipend: 15000, maxDurationMonths: 6, maxExperienceYears: 2,
    })
  })

  it('drops the row bookkeeping columns', async () => {
    const f = await getUserFilters(selectDb([ROW]), 'u1')
    expect(f.userId).toBeUndefined()
    expect(f.updatedAt).toBeUndefined()
  })

  it('normalizes a legacy row that predates the new columns', async () => {
    const legacy = { userId: 'u1', includeKeywords: ['react'], excludeKeywords: [], locations: [] }
    const f = await getUserFilters(selectDb([legacy]), 'u1')
    expect(f.levels).toEqual([])
    expect(f.maxDegree).toBeNull()
    expect(f.minStipend).toBeNull()
  })
})

describe('upsertUserFilters', () => {
  it('writes every new field on insert and on conflict', async () => {
    const { db, calls } = insertDb()
    await upsertUserFilters(db, 'u1', {
      levels: ['senior'], maxDegree: 'masters',
      minStipend: 50000, maxDurationMonths: 12, maxExperienceYears: 5,
    })
    expect(calls.values.userId).toBe('u1')
    expect(calls.values.levels).toEqual(['senior'])
    expect(calls.values.maxDegree).toBe('masters')
    expect(calls.values.minStipend).toBe(50000)
    expect(calls.values.maxDurationMonths).toBe(12)
    expect(calls.values.maxExperienceYears).toBe(5)
    expect(calls.set.levels).toEqual(['senior'])
    expect(calls.set.maxExperienceYears).toBe(5)
  })

  it('fills the NOT NULL array columns when the caller omits them', async () => {
    const { db, calls } = insertDb()
    await upsertUserFilters(db, 'u1', {})
    expect(calls.values.levels).toEqual([])
    expect(calls.values.locations).toEqual([])
    expect(calls.values.maxDegree).toBeNull()
  })

  it('never writes the user id into the conflict update set', async () => {
    const { db, calls } = insertDb()
    await upsertUserFilters(db, 'u1', {})
    expect(calls.set.userId).toBeUndefined()
  })
})

describe('listUsersForNotify', () => {
  it('hands the new filter fields to the notifier', async () => {
    const db = selectDb([{ userId: 'u1', channel: 'telegram', telegramChatId: '1', enabled: true }], [ROW])
    const [entry] = await listUsersForNotify(db)
    expect(entry.filters.levels).toEqual(['entry', 'mid'])
    expect(entry.filters.maxDegree).toBe('bachelors')
  })
})
