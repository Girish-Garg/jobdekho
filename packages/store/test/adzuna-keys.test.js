import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore, FILES } from '@jobdekho/store/open.js'
import { upsertProfile } from '@jobdekho/store/profiles.js'
import {
  normalizeAdzunaKeys, savedAdzunaKeys, saveAdzunaKeys, clearAdzunaKeys, envAdzunaKeys, resolveAdzunaKeys,
} from '@jobdekho/store/adzuna-keys.js'

let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-adzuna-keys-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const PAIR = { appId: 'id123abc', appKey: 'k'.repeat(28) + '1a2b' }
const ENV = { ADZUNA_APP_ID: 'envid99', ADZUNA_APP_KEY: 'e'.repeat(28) + '9z9z' }

describe('normalizeAdzunaKeys', () => {
  it('trims both halves and keeps only a whole pair', () => {
    expect(normalizeAdzunaKeys({ appId: ' id1 ', appKey: '\tkey2\n' })).toEqual({ appId: 'id1', appKey: 'key2' })
    expect(normalizeAdzunaKeys({ appId: 'id1', appKey: '' })).toBeNull()
    expect(normalizeAdzunaKeys({ appKey: 'key2' })).toBeNull()
    expect(normalizeAdzunaKeys(null)).toBeNull()
  })

  it('refuses anything that is not letters, digits, - or _', () => {
    expect(normalizeAdzunaKeys({ appId: 'id 1', appKey: 'key' })).toBeNull()
    expect(normalizeAdzunaKeys({ appId: 'id', appKey: 'key&x=1' })).toBeNull()
    expect(normalizeAdzunaKeys({ appId: 'id', appKey: 'k'.repeat(129) })).toBeNull()
    expect(normalizeAdzunaKeys({ appId: 5, appKey: 'key' })).toBeNull()
  })
})

describe('the saved Adzuna key', () => {
  it('is kept per user, in a file of its own and nowhere else', async () => {
    const store = openStore(dir)
    await upsertProfile(store, 'me', { skills: ['python'] })
    saveAdzunaKeys(store, 'me', PAIR)
    expect(savedAdzunaKeys(store, 'me')).toEqual(PAIR)
    expect(savedAdzunaKeys(store, 'someone-else')).toBeNull()
    expect(JSON.parse(readFileSync(join(dir, FILES.adzuna), 'utf8'))).toEqual({ me: PAIR })
    for (const name of readdirSync(dir).filter((n) => n !== FILES.adzuna)) {
      expect(readFileSync(join(dir, name), 'utf8')).not.toContain(PAIR.appKey)
    }
  })

  it('is seen by a second handle on the same folder, the way the scrape sees it', () => {
    saveAdzunaKeys(openStore(dir), 'me', PAIR)
    expect(savedAdzunaKeys(openStore(dir), 'me')).toEqual(PAIR)
  })

  it('is cleared for that user only', () => {
    const store = openStore(dir)
    saveAdzunaKeys(store, 'me', PAIR)
    saveAdzunaKeys(store, 'you', PAIR)
    clearAdzunaKeys(store, 'me')
    expect(savedAdzunaKeys(store, 'me')).toBeNull()
    expect(savedAdzunaKeys(store, 'you')).toEqual(PAIR)
  })

  it('will not save half a pair', () => {
    expect(() => saveAdzunaKeys(openStore(dir), 'me', { appId: 'id' })).toThrow(/both needed/)
  })

  it('reads a record edited into nonsense by hand as no key', () => {
    const store = openStore(dir)
    store.adzuna.set('me', { appId: 'id', appKey: 42 })
    expect(savedAdzunaKeys(store, 'me')).toBeNull()
  })
})

describe('resolveAdzunaKeys', () => {
  it('prefers the pair saved in Settings over the environment', () => {
    const store = openStore(dir)
    saveAdzunaKeys(store, 'me', PAIR)
    expect(resolveAdzunaKeys(store, 'me', ENV)).toEqual({ ...PAIR, from: 'settings' })
  })

  it('falls back to ADZUNA_APP_ID and ADZUNA_APP_KEY', () => {
    expect(resolveAdzunaKeys(openStore(dir), 'me', ENV)).toEqual({ appId: 'envid99', appKey: ENV.ADZUNA_APP_KEY, from: 'environment' })
  })

  it('uses the environment alone when no user is named, as a bare scrape does', () => {
    const store = openStore(dir)
    saveAdzunaKeys(store, 'me', PAIR)
    expect(resolveAdzunaKeys(store, null, ENV)).toMatchObject({ from: 'environment' })
  })

  it('is null with neither, or with only half a pair in the environment', () => {
    expect(resolveAdzunaKeys(openStore(dir), 'me', {})).toBeNull()
    expect(resolveAdzunaKeys(openStore(dir), 'me', { ADZUNA_APP_ID: 'x' })).toBeNull()
    expect(envAdzunaKeys({ ADZUNA_APP_ID: '', ADZUNA_APP_KEY: 'y' })).toBeNull()
  })
})
