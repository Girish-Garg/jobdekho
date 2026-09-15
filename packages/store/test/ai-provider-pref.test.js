import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
import { normalizeProviderPref, getProviderPref, upsertProviderPref } from '@jobdekho/store/ai-provider-pref.js'

let dir
let store
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-store-')); store = openStore(dir) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

describe('normalizeProviderPref', () => {
  it('defaults to auto for nothing, an empty value, or a non-string', () => {
    expect(normalizeProviderPref(undefined)).toEqual({ provider: 'auto' })
    expect(normalizeProviderPref({})).toEqual({ provider: 'auto' })
    expect(normalizeProviderPref({ provider: '' })).toEqual({ provider: 'auto' })
    expect(normalizeProviderPref({ provider: 7 })).toEqual({ provider: 'auto' })
  })

  it('keeps any other provider id as given, ids are not this layer\'s business', () => {
    expect(normalizeProviderPref({ provider: 'claude' })).toEqual({ provider: 'claude' })
    expect(normalizeProviderPref({ provider: 'agy' })).toEqual({ provider: 'agy' })
  })
})

describe('getProviderPref / upsertProviderPref', () => {
  it('reads null until saved, then the normalized record', async () => {
    expect(await getProviderPref(store, 'me')).toBeNull()
    await upsertProviderPref(store, 'me', { provider: 'claude' })
    expect(await getProviderPref(store, 'me')).toEqual({ provider: 'claude' })
  })

  it('keeps one person\'s preference from leaking into another\'s read', async () => {
    await upsertProviderPref(store, 'me', { provider: 'agy' })
    expect(await getProviderPref(store, 'someone-else')).toBeNull()
  })
})
