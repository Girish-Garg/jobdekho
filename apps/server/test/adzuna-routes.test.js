import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Writable } from 'node:stream'
import { buildApp } from '@jobdekho/server/app.js'
import { createDashboardStore } from '@jobdekho/server/api/store.js'
import { openStore, FILES } from '@jobdekho/store/open.js'
import { saveAdzunaKeys } from '@jobdekho/store/adzuna-keys.js'

// A temporary data folder, no environment and a fake Adzuna per test:
// nothing here reaches the network, the real data folder or the real .env.
let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-adzuna-routes-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const ID = 'a1b2c3d4'
const KEY = 'f00dfeedcafe0000beef99991234abcd'
const ENV_KEY = 'e0e0e0e0e0e0e0e0e0e0e0e0e0e09z9z'
const config = { sessionSecret: 'test-secret', devUserId: 'local' }
const reply = (status, body) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => body })

async function makeApp({ fetchImpl = vi.fn(reply(200, { results: [] })), env = {}, store = openStore(dir), cfg = config } = {}) {
  const lines = []
  const stream = new Writable({ write(chunk, enc, done) { lines.push(String(chunk)); done() } })
  const app = buildApp({ config: cfg, dashboardStore: createDashboardStore(store), logger: { level: 'trace', stream } })
  app.decorate('adzunaStore', store)
  app.decorate('adzunaEnv', env)
  app.decorate('adzunaFetch', fetchImpl)
  await app.ready()
  const call = async (method, url, payload) => app.inject({ method, url, payload })
  return { app, store, fetchImpl, log: () => lines.join(''), call }
}

const none = { configured: false, from: null, appId: null, keyEnd: null, lastRun: null }

describe('GET and PUT /api/adzuna', () => {
  it('answers 401 without an identity', async () => {
    const { call } = await makeApp({ cfg: { sessionSecret: 'test-secret' } })
    expect((await call('GET', '/api/adzuna')).statusCode).toBe(401)
    expect((await call('PUT', '/api/adzuna', { appId: ID, appKey: KEY })).statusCode).toBe(401)
    expect((await call('POST', '/api/adzuna/check', {})).statusCode).toBe(401)
  })

  it('says there is no key on a fresh install', async () => {
    const { call } = await makeApp()
    expect((await call('GET', '/api/adzuna')).json()).toEqual(none)
  })

  it('saves a pair and shows the app id and only the last four of the key', async () => {
    const { call } = await makeApp()
    const saved = await call('PUT', '/api/adzuna', { appId: ` ${ID} `, appKey: `${KEY}\n` })
    const view = { configured: true, from: 'settings', appId: ID, keyEnd: 'abcd', lastRun: null }
    expect(saved.statusCode).toBe(200)
    expect(saved.json()).toEqual(view)
    expect(saved.body).not.toContain(KEY)
    expect((await call('GET', '/api/adzuna')).json()).toEqual(view)
    expect(JSON.parse(readFileSync(join(dir, FILES.adzuna), 'utf8'))).toEqual({ local: { appId: ID, appKey: KEY } })
  })

  it('falls back to the environment, and the saved pair wins over it', async () => {
    const { call } = await makeApp({ env: { ADZUNA_APP_ID: 'envid', ADZUNA_APP_KEY: ENV_KEY } })
    expect((await call('GET', '/api/adzuna')).json()).toMatchObject({ configured: true, from: 'environment', appId: 'envid', keyEnd: '9z9z' })
    await call('PUT', '/api/adzuna', { appId: ID, appKey: KEY })
    expect((await call('GET', '/api/adzuna')).json()).toMatchObject({ from: 'settings', appId: ID, keyEnd: 'abcd' })
  })

  it('clears the saved pair when both fields are sent empty', async () => {
    const { call } = await makeApp()
    await call('PUT', '/api/adzuna', { appId: ID, appKey: KEY })
    const res = await call('PUT', '/api/adzuna', { appId: '', appKey: '' })
    expect(res.json()).toEqual(none)
    expect(JSON.parse(readFileSync(join(dir, FILES.adzuna), 'utf8'))).toEqual({})
  })

  it('refuses half a pair, or one with anything else pasted in, without quoting it', async () => {
    const { call } = await makeApp()
    const half = await call('PUT', '/api/adzuna', { appId: '', appKey: KEY })
    expect(half.statusCode).toBe(400)
    expect(half.json().error).toMatch(/both the app id and the key/)
    const odd = await call('PUT', '/api/adzuna', { appId: ID, appKey: `${KEY} &x=1` })
    expect(odd.statusCode).toBe(400)
    expect(odd.body).not.toContain(KEY)
    const long = await call('PUT', '/api/adzuna', { appId: ID, appKey: KEY.repeat(10) })
    expect(long.statusCode).toBe(400)
    expect(long.body).not.toContain(KEY)
    expect((await call('GET', '/api/adzuna')).json()).toEqual(none)
  })
})

describe('the last run, on GET /api/adzuna', () => {
  const run = (sourceResults) => JSON.stringify({ id: 'r', startedAt: '2026-09-30T08:00:00.000Z', sourceResults, newCount: 3 })

  it('reports how Adzuna did in the most recent run', async () => {
    writeFileSync(join(dir, FILES.runs), `${run([{ name: 'lever:acme', ok: true, count: 4, error: null }, { name: 'adzuna:in', ok: true, count: 42, error: null }])}\n`)
    const { call } = await makeApp()
    expect((await call('GET', '/api/adzuna')).json().lastRun).toEqual({ at: '2026-09-30T08:00:00.000Z', ok: true, count: 42, error: null })
  })

  it('shows a failure with the key taken out of it', async () => {
    const error = `HTTP 401 for https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${ID}&app_key=${KEY} (${KEY})`
    writeFileSync(join(dir, FILES.runs), `${run([{ name: 'adzuna:in', ok: false, count: 0, error }])}\n`)
    const store = openStore(dir)
    saveAdzunaKeys(store, 'local', { appId: ID, appKey: KEY })
    const { call } = await makeApp({ store })
    const res = await call('GET', '/api/adzuna')
    expect(res.json().lastRun).toMatchObject({ ok: false, count: 0, error: expect.stringContaining('HTTP 401') })
    expect(res.body).not.toContain(KEY)
  })

  it('is null when the last run had no Adzuna in it', async () => {
    const earlier = run([{ name: 'adzuna:in', ok: true, count: 9, error: null }])
    writeFileSync(join(dir, FILES.runs), `${earlier}\n${run([{ name: 'lever:acme', ok: true, count: 1, error: null }])}\n`)
    const { call } = await makeApp()
    expect((await call('GET', '/api/adzuna')).json().lastRun).toBeNull()
  })
})

describe('POST /api/adzuna/check', () => {
  it('tries a typed pair with ONE request for one Indian listing', async () => {
    const fetchImpl = vi.fn(reply(200, { results: [{ id: 1 }], count: 5000 }))
    const { call } = await makeApp({ fetchImpl })
    const res = await call('POST', '/api/adzuna/check', { appId: ID, appKey: KEY })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true, message: 'Adzuna accepted this key.' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const url = new URL(fetchImpl.mock.calls[0][0])
    expect(url.pathname).toBe('/v1/api/jobs/in/search/1')
    expect(url.searchParams.get('results_per_page')).toBe('1')
    expect(url.searchParams.get('app_key')).toBe(KEY)
    expect(res.body).not.toContain(KEY)
  })

  it('checks the saved pair when the key field is left empty', async () => {
    const store = openStore(dir)
    saveAdzunaKeys(store, 'local', { appId: ID, appKey: KEY })
    const fetchImpl = vi.fn(reply(200, { results: [] }))
    const { call } = await makeApp({ store, fetchImpl })
    expect((await call('POST', '/api/adzuna/check', { appId: 'ignored', appKey: '' })).json().ok).toBe(true)
    expect(new URL(fetchImpl.mock.calls[0][0]).searchParams.get('app_id')).toBe(ID)
  })

  it('says there is nothing to check, without calling Adzuna, when no key exists', async () => {
    const { call, fetchImpl } = await makeApp()
    const res = await call('POST', '/api/adzuna/check', {})
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/No Adzuna key is saved yet/)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('refuses a typed key with no app id', async () => {
    const { call, fetchImpl } = await makeApp()
    expect((await call('POST', '/api/adzuna/check', { appKey: KEY })).statusCode).toBe(400)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  const cases = [
    ['a bad key', reply(401, { exception: 'AUTH_FAIL' }), 'rejected', /did not accept/],
    ['a bad key sent back as a 400', reply(400, { exception: 'AUTH_FAIL' }), 'rejected', /did not accept/],
    ['a key out of free requests', reply(429, {}), 'limit', /used up its free requests/],
    ['Adzuna itself failing', reply(503, null), 'adzuna', /HTTP 503/],
    ['an answer with no listings in it', reply(200, { hello: 1 }), 'adzuna', /not with job listings/],
    ['no network', async () => { throw new TypeError(`fetch failed for app_key=${KEY}`) }, 'network', /Could not reach Adzuna/],
  ]
  for (const [what, answer, problem, message] of cases) {
    it(`tells ${what} apart, in plain words`, async () => {
      const { call, log } = await makeApp({ fetchImpl: vi.fn(answer) })
      const res = await call('POST', '/api/adzuna/check', { appId: ID, appKey: KEY })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({ ok: false, problem, message: expect.stringMatching(message) })
      expect(res.body).not.toContain(KEY)
      expect(log()).not.toContain(KEY)
    })
  }
})

describe('the key in logs', () => {
  it('never reaches a log line, whatever the routes are asked', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error(`boom app_key=${KEY}`) })
    const { call, log, store } = await makeApp({ fetchImpl })
    await call('PUT', '/api/adzuna', { appId: ID, appKey: KEY })
    await call('GET', '/api/adzuna')
    await call('POST', '/api/adzuna/check', { appId: ID, appKey: KEY })
    await call('POST', '/api/adzuna/check', {})
    await call('PUT', '/api/adzuna', { appId: ID, appKey: `${KEY}!` })
    // A disk that refuses the write: a 500, logged, with nothing of the key.
    store.adzuna.set = () => { throw Object.assign(new Error('ENOSPC: no space left on device, write'), { code: 'ENOSPC' }) }
    const failed = await call('PUT', '/api/adzuna', { appId: ID, appKey: KEY })
    expect(failed.statusCode).toBe(500)
    expect(failed.body).not.toContain(KEY)
    expect(log()).toContain('ENOSPC')
    expect(log()).toContain('/api/adzuna')
    expect(log()).not.toContain(KEY)
  })
})
