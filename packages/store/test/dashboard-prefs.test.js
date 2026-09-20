import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
import { normalizeFilters, getUserFilters, upsertUserFilters } from '@jobdekho/store/dashboard-prefs.js'

let dir
let store
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-store-')); store = openStore(dir) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

describe('normalize', () => {
  it('fills every filter default and keeps zero', () => {
    expect(normalizeFilters(null)).toEqual({
      includeKeywords: [], excludeKeywords: [], locations: [], levels: [], sources: [], excludedSources: [],
      workModes: [], maxDegree: null, minStipend: null, maxDurationMonths: null, maxExperienceYears: null,
    })
    expect(normalizeFilters({ minStipend: 0, levels: ['entry'] })).toMatchObject({ minStipend: 0, levels: ['entry'] })
  })
})

describe('filters', () => {
  it('reads null until saved, then the normalized record', async () => {
    expect(await getUserFilters(store, 'me')).toBeNull()
    await upsertUserFilters(store, 'me', { includeKeywords: ['react'], maxDegree: 'masters' })
    expect(await getUserFilters(store, 'me')).toMatchObject({ includeKeywords: ['react'], maxDegree: 'masters', levels: [] })
    await upsertUserFilters(store, 'me', { levels: ['entry'] })
    expect(await getUserFilters(store, 'me')).toMatchObject({ includeKeywords: [], levels: ['entry'] })
  })
})
