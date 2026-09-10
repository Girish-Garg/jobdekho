import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
import {
  normalizeFilters, normalizePrefs, getUserFilters, upsertUserFilters,
  getNotificationPrefs, upsertNotificationPrefs, listUsersForNotify,
} from '@jobdekho/store/dashboard-prefs.js'

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

  it('fills every pref default', () => {
    expect(normalizePrefs(undefined)).toEqual({ channel: 'none', telegramChatId: null, enabled: true })
    expect(normalizePrefs({ channel: 'telegram', telegramChatId: '1', enabled: false }))
      .toEqual({ channel: 'telegram', telegramChatId: '1', enabled: false })
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

describe('notification prefs', () => {
  it('reads null until saved, then only the three pref fields', async () => {
    expect(await getNotificationPrefs(store, 'me')).toBeNull()
    await upsertNotificationPrefs(store, 'me', { channel: 'telegram', telegramChatId: '42', extra: 'ignored' })
    expect(await getNotificationPrefs(store, 'me')).toEqual({ channel: 'telegram', telegramChatId: '42', enabled: true })
  })
})

describe('listUsersForNotify', () => {
  it('lists enabled users on a real channel, with their filters when they have any', async () => {
    await upsertNotificationPrefs(store, 'with-filters', { channel: 'telegram', telegramChatId: '1' })
    await upsertUserFilters(store, 'with-filters', { levels: ['entry'] })
    await upsertNotificationPrefs(store, 'no-filters', { channel: 'telegram', telegramChatId: '2' })
    await upsertNotificationPrefs(store, 'off', { channel: 'telegram', telegramChatId: '3', enabled: false })
    await upsertNotificationPrefs(store, 'none', { channel: 'none' })
    await upsertUserFilters(store, 'filters-only', { levels: ['mid'] })
    const users = await listUsersForNotify(store)
    expect(users.map((u) => u.userId).sort()).toEqual(['no-filters', 'with-filters'])
    const byId = Object.fromEntries(users.map((u) => [u.userId, u]))
    expect(byId['with-filters'].filters).toMatchObject({ levels: ['entry'] })
    expect(byId['with-filters'].prefs).toEqual({ channel: 'telegram', telegramChatId: '1', enabled: true })
    expect(byId['no-filters'].filters).toBeNull()
  })

  it('is empty on a fresh store', async () => {
    expect(await listUsersForNotify(store)).toEqual([])
  })
})
