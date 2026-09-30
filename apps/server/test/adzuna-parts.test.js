import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { redactKey, keyEnd } from '@jobdekho/server/adzuna/redact.js'
import { adzunaResult } from '@jobdekho/server/adzuna/last-result.js'
import { adzunaView } from '@jobdekho/server/adzuna/view.js'
import { readKeysInput, NEEDS_BOTH, BAD_SHAPE } from '@jobdekho/server/adzuna/input.js'
import { checkAdzunaKeys } from '@jobdekho/server/adzuna/check.js'
import { scrapeRunner } from '@jobdekho/server/scrape/run.js'
import { openStore } from '@jobdekho/store/open.js'
import { saveAdzunaKeys } from '@jobdekho/store/adzuna-keys.js'
import { runScrape } from '@jobdekho/scraper/scrape.js'

const KEY = 'f00dfeedcafe0000beef99991234abcd'

describe('redactKey and keyEnd', () => {
  it('takes the key out of a URL and out of any other text', () => {
    const out = redactKey(`the key ${KEY} failed: HTTP 401 for https://x/y?app_id=abc&app_key=${KEY}`, KEY)
    expect(out).toBe('the key REDACTED failed: HTTP 401 for https://x/y?app_id=REDACTED&app_key=REDACTED')
  })

  it('still redacts URLs when no key is known', () => {
    expect(redactKey(`?app_key=${KEY}`, null)).toBe('?app_key=REDACTED')
    expect(redactKey(undefined, KEY)).toBe('')
  })

  it('shows the last four of a key, and nothing of one too short for four to be a small part', () => {
    expect(keyEnd(KEY)).toBe('abcd')
    expect(keyEnd('shortkey')).toBeNull()
    expect(keyEnd(null)).toBeNull()
  })
})

describe('adzunaResult', () => {
  const run = (sourceResults) => ({ startedAt: '2026-09-30T08:00:00.000Z', sourceResults })

  it('is null with no run, or a run without Adzuna in it', () => {
    expect(adzunaResult(null)).toBeNull()
    expect(adzunaResult(run([{ name: 'lever:acme', ok: true, count: 1 }]))).toBeNull()
    expect(adzunaResult({ sourceResults: 'nonsense' })).toBeNull()
  })

  it('reads a success and a failure', () => {
    expect(adzunaResult(run([{ name: 'adzuna:in', ok: true, count: 12, error: null }])))
      .toEqual({ at: '2026-09-30T08:00:00.000Z', ok: true, count: 12, error: null })
    expect(adzunaResult(run([{ name: 'adzuna:in', ok: false, count: 0, error: 'HTTP 401' }])))
      .toMatchObject({ ok: false, error: 'HTTP 401' })
  })
})

describe('adzunaView', () => {
  it('never carries the whole key, even through a stored error', () => {
    const view = adzunaView({ appId: 'id', appKey: KEY, from: 'settings' }, { at: null, ok: false, count: 0, error: `bad ${KEY}` })
    expect(view).toEqual({ configured: true, from: 'settings', appId: 'id', keyEnd: 'abcd', lastRun: { at: null, ok: false, count: 0, error: 'bad REDACTED' } })
    expect(JSON.stringify(view)).not.toContain(KEY)
  })
})

describe('readKeysInput', () => {
  it('reads a pair, two empty fields, half a pair and a bad paste', () => {
    expect(readKeysInput({ appId: ' id ', appKey: ` ${KEY} ` })).toEqual({ keys: { appId: 'id', appKey: KEY } })
    expect(readKeysInput({ appId: '', appKey: '  ' })).toEqual({ keys: null })
    expect(readKeysInput(null)).toEqual({ keys: null })
    expect(readKeysInput({ appId: 'id' })).toEqual({ error: NEEDS_BOTH })
    expect(readKeysInput({ appId: 'id', appKey: 'a key' })).toEqual({ error: BAD_SHAPE })
  })
})

describe('checkAdzunaKeys', () => {
  it('gives up on a silent Adzuna as a network problem', async () => {
    const hang = (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason)))
    expect(await checkAdzunaKeys({ appId: 'id', appKey: KEY }, { fetchImpl: hang, timeoutMs: 5 }))
      .toMatchObject({ ok: false, problem: 'network' })
  })
})

// The app's refresh uses the saved key: server.js names the local user, and
// the runner hands that on to the scraper's shared runScrape.
describe('the server\'s refresh and a saved key', () => {
  let dir
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-adzuna-run-')) })
  afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

  it('includes Adzuna for the user it runs as', async () => {
    const store = openStore(dir)
    saveAdzunaKeys(store, 'local', { appId: 'id', appKey: KEY })
    const http = vi.fn(async () => ({ json: async () => ({ results: [] }) }))
    const config = { companies: {}, rules: { includeKeywords: [], excludeKeywords: [], locations: [] } }
    const load = async () => ({ runScrape: (opts) => runScrape({ ...opts, env: {}, config, http }) })
    const result = await scrapeRunner(store, { load, userId: 'local' })({ onProgress: () => {} })
    expect(result).toMatchObject({ failed: [] })
    expect(http).toHaveBeenCalledTimes(1)
    expect(store.runs.all()[0].sourceResults).toEqual([{ name: 'adzuna:in', ok: true, count: 0, error: null }])
  })

  it('leaves it out when the runner is not told whose key to use', async () => {
    const store = openStore(dir)
    saveAdzunaKeys(store, 'local', { appId: 'id', appKey: KEY })
    const http = vi.fn()
    const config = { companies: {}, rules: { includeKeywords: [], excludeKeywords: [], locations: [] } }
    const load = async () => ({ runScrape: (opts) => runScrape({ ...opts, env: {}, config, http }) })
    await scrapeRunner(store, { load })({ onProgress: () => {} })
    expect(http).not.toHaveBeenCalled()
  })
})
