import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
import { saveAdzunaKeys } from '@jobdekho/store/adzuna-keys.js'
import { scrapeAdapters } from '../src/sources.js'
import { runScrape } from '../src/scrape.js'

// A temporary data folder, an empty source list and a fake Adzuna: nothing
// here reaches the network, the real data folder or the real environment.
let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-sources-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const KEYS = { appId: 'id123', appKey: 'secretkey0000000000000000001a2b' }
const named = (...names) => () => names.map((name) => ({ name, fetch: async () => [] }))

describe('scrapeAdapters', () => {
  it('runs the listed sources alone when there is no key', () => {
    expect(scrapeAdapters({}, null, { build: named('internshala', 'lever:acme') }).map((a) => a.name))
      .toEqual(['internshala', 'lever:acme'])
  })

  it('adds Adzuna whenever there is a key, without companies.json naming it', () => {
    expect(scrapeAdapters({}, { ...KEYS, from: 'settings' }, { build: named('internshala') }).map((a) => a.name))
      .toEqual(['internshala', 'adzuna:in'])
  })

  // Two would fetch the same postings twice on the free tier's requests.
  it('replaces an "adzuna" entry already listed rather than running two', () => {
    const names = scrapeAdapters({}, KEYS, { build: named('adzuna:in', 'unstop') }).map((a) => a.name)
    expect(names).toEqual(['unstop', 'adzuna:in'])
  })

  it('reads the real registry by default', () => {
    expect(scrapeAdapters({ boards: ['internshala'] }, KEYS).map((a) => a.name)).toEqual(['internshala', 'adzuna:in'])
  })
})

const RULES = { includeKeywords: ['developer'], excludeKeywords: [], locations: ['india', 'bengaluru'] }
const config = { companies: {}, rules: RULES }
const listing = {
  id: 77, title: 'Backend Developer', company: { display_name: 'Acme India' },
  location: { display_name: 'Bengaluru, India' }, redirect_url: 'https://www.adzuna.in/land/ad/77',
  description: 'Build services', created: new Date().toISOString(),
}
const fakeAdzuna = () => vi.fn(async () => ({ json: async () => ({ results: [listing] }) }))

describe('runScrape and Adzuna', () => {
  it('includes Adzuna with the key saved in Settings, and stores what it found', async () => {
    const db = openStore(dir)
    saveAdzunaKeys(db, 'local', KEYS)
    const http = fakeAdzuna()
    const out = await runScrape({ db, userId: 'local', env: {}, config, http })
    expect(out.results).toEqual([{ name: 'adzuna:in', ok: true, count: 1, error: null }])
    expect(http.mock.calls[0][0]).toContain(`app_key=${KEYS.appKey}`)
    expect(db.corpus.rows().map((p) => p.title)).toEqual(['Backend Developer'])
  })

  it('falls back to ADZUNA_APP_ID and ADZUNA_APP_KEY, as `npm run scrape` from .env does', async () => {
    const http = fakeAdzuna()
    const env = { ADZUNA_APP_ID: 'envid', ADZUNA_APP_KEY: 'envkey' }
    const out = await runScrape({ db: openStore(dir), userId: 'local', env, config, http })
    expect(out.results.map((r) => r.name)).toEqual(['adzuna:in'])
    expect(http.mock.calls[0][0]).toContain('app_key=envkey')
  })

  it('leaves Adzuna out, and never calls it, when there is no key', async () => {
    const http = vi.fn()
    const out = await runScrape({ db: openStore(dir), userId: 'local', env: {}, config, http })
    expect(out.results).toEqual([])
    expect(http).not.toHaveBeenCalled()
  })

  it('does not use another user\'s saved key', async () => {
    const db = openStore(dir)
    saveAdzunaKeys(db, 'someone-else', KEYS)
    const out = await runScrape({ db, userId: 'local', env: {}, config, http: vi.fn() })
    expect(out.results).toEqual([])
  })
})
