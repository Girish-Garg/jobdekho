import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from '@jobdekho/server/app.js'
import { createDashboardStore } from '@jobdekho/server/api/store.js'
import { createScrapeService } from '@jobdekho/server/scrape/service.js'
import { scrapeRunner } from '@jobdekho/server/scrape/run.js'
import { startAutoRefresh } from '@jobdekho/server/scrape/auto.js'
import { openStore } from '@jobdekho/store/open.js'
import { runScrape } from '@jobdekho/scraper/scrape.js'

const config = { sessionSecret: 'test-secret', devUserId: 'local' }
const RESULT = { fresh: 37, total: 900, tooOld: 4, removed: 2, failed: ['linkedin'] }

// A temporary data folder per test and a scrape that never fetches anything.
let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-scrape-routes-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

// A scrape that finishes only when the test says so.
function heldRun() {
  let finish
  let fail
  let onProgress
  const run = vi.fn((opts) => {
    onProgress = opts.onProgress
    return new Promise((resolve, reject) => { finish = resolve; fail = reject })
  })
  return { run, finish: (v) => finish(v), fail: (e) => fail(e), progress: (p) => onProgress(p) }
}

async function makeApp({ run, store = openStore(dir), cfg = config, now } = {}) {
  const scrape = createScrapeService(store, { run, ...(now && { now }) })
  const app = buildApp({ config: cfg, dashboardStore: createDashboardStore(store) })
  app.decorate('scrape', scrape)
  await app.ready()
  const get = async (url) => app.inject({ method: 'GET', url })
  const post = async () => app.inject({ method: 'POST', url: '/api/scrape' })
  const put = async (body) => app.inject({ method: 'PUT', url: '/api/scrape/settings', payload: body })
  return { app, scrape, store, get, post, put }
}

describe('POST /api/scrape and GET /api/scrape', () => {
  it('answers 401 without an identity', async () => {
    const { get, post } = await makeApp({ run: vi.fn(), cfg: { sessionSecret: 'test-secret' } })
    expect((await get('/api/scrape')).statusCode).toBe(401)
    expect((await post()).statusCode).toBe(401)
  })

  it('says nothing is running and nothing has run on a fresh install', async () => {
    const { get } = await makeApp({ run: vi.fn() })
    const res = await get('/api/scrape')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      running: false, startedAt: null, finishedAt: null, done: 0, total: 0, lastRun: null,
      linkedin: { lastSweepAt: null, pausedUntil: null, nextAfter: null },
      health: { paused: [], alerts: [] },
    })
  })

  it('starts a run and answers 202 at once, without waiting for the scrape', async () => {
    const held = heldRun()
    const { post } = await makeApp({ run: held.run })
    const res = await post()
    expect(res.statusCode).toBe(202)
    expect(res.json()).toMatchObject({ running: true, done: 0, total: 0 })
  })

  it('refuses a second run with a sentence while one is going', async () => {
    const held = heldRun()
    const { post } = await makeApp({ run: held.run })
    await post()
    const res = await post()
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toMatch(/already being refreshed/)
    expect(held.run).toHaveBeenCalledTimes(1)
  })

  it('reports progress to a page that only polls, then the result', async () => {
    const held = heldRun()
    const { post, get, scrape } = await makeApp({ run: held.run })
    await post()
    await vi.waitFor(() => expect(held.run).toHaveBeenCalled())
    held.progress({ done: 42, total: 118, current: 'internshala' })
    expect((await get('/api/scrape')).json()).toMatchObject({ running: true, done: 42, total: 118, current: 'internshala' })
    held.finish(RESULT)
    await vi.waitFor(() => expect(scrape.job.isRunning()).toBe(false))
    const done = (await get('/api/scrape')).json()
    expect(done).toMatchObject({ running: false, result: RESULT, done: 42, total: 118 })
    expect(done.finishedAt).toEqual(expect.any(String))
    expect(done).not.toHaveProperty('current')
  })

  it('reports a failed run as a sentence, and lets the next one start', async () => {
    const held = heldRun()
    const { post, get, scrape } = await makeApp({ run: held.run })
    await post()
    await vi.waitFor(() => expect(held.run).toHaveBeenCalled())
    held.fail(new Error('boom'))
    await vi.waitFor(() => expect(scrape.job.isRunning()).toBe(false))
    expect((await get('/api/scrape')).json()).toMatchObject({ running: false, error: expect.stringContaining('could not finish') })
    expect((await post()).statusCode).toBe(202)
  })

  // The whole path with the real scraper and store, only the sources faked:
  // the feed reads the new postings the moment the run ends, with no restart.
  it('puts the new postings in the feed and the run in lastRun as soon as it finishes', async () => {
    const store = openStore(dir)
    const config2 = { companies: {}, rules: { includeKeywords: ['software'], excludeKeywords: [], locations: ['remote'], internshipOnly: true } }
    const adapters = [{ name: 'fake', fetch: async () => [{ externalId: '1', title: 'Software Intern', company: 'Acme', url: 'u/1', location: 'Remote' }] }]
    const fake = { runScrape: (opts) => runScrape({ ...opts, config: config2, adapters, http: () => { throw new Error('network') } }) }
    const { post, get, scrape } = await makeApp({ store, run: scrapeRunner(store, { load: async () => fake }) })
    expect((await get('/api/postings')).json().postings).toHaveLength(0)
    await post()
    await vi.waitFor(() => expect(scrape.job.isRunning()).toBe(false))
    const state = (await get('/api/scrape')).json()
    expect(state.result).toEqual({ fresh: 1, total: 1, tooOld: 0, removed: 0, closed: 0, checked: 0, failed: [], skipped: [] })
    expect(state.lastRun).toMatchObject({ fresh: 1, sources: 1, failed: [] })
    expect((await get('/api/postings')).json().postings.map((p) => p.title)).toEqual(['Software Intern'])
  })
})

describe('/api/scrape/settings', () => {
  it('has both switches on by default', async () => {
    const { get } = await makeApp({ run: vi.fn() })
    expect((await get('/api/scrape/settings')).json()).toEqual({ autoRefresh: true, linkedin: true })
  })

  it('saves the switch and reads it back', async () => {
    const { get, put } = await makeApp({ run: vi.fn() })
    expect((await put({ autoRefresh: false })).statusCode).toBe(204)
    expect((await get('/api/scrape/settings')).json()).toEqual({ autoRefresh: false, linkedin: true })
    await put({ autoRefresh: true })
    expect((await get('/api/scrape/settings')).json()).toEqual({ autoRefresh: true, linkedin: true })
  })

  // Each switch is saved as it is flipped, so a body names only that one.
  it('saves Include LinkedIn on its own, leaving the daily refresh as it was', async () => {
    const { get, put } = await makeApp({ run: vi.fn() })
    await put({ autoRefresh: false })
    expect((await put({ linkedin: false })).statusCode).toBe(204)
    expect((await get('/api/scrape/settings')).json()).toEqual({ autoRefresh: false, linkedin: false })
    await put({ linkedin: true })
    expect((await get('/api/scrape/settings')).json()).toEqual({ autoRefresh: false, linkedin: true })
  })

  it('refuses a body without a yes or no', async () => {
    const { put } = await makeApp({ run: vi.fn() })
    expect((await put({})).statusCode).toBe(400)
    expect((await put({ autoRefresh: 'sometimes' })).statusCode).toBe(400)
    expect((await put({ linkedin: 'maybe' })).statusCode).toBe(400)
    expect((await put({ other: true })).statusCode).toBe(400)
  })

  it('answers 401 without an identity', async () => {
    const { get, put } = await makeApp({ run: vi.fn(), cfg: { sessionSecret: 'test-secret' } })
    expect((await get('/api/scrape/settings')).statusCode).toBe(401)
    expect((await put({ autoRefresh: false })).statusCode).toBe(401)
  })
})

// The server's two ways to refresh, the Refresh button and the daily check,
// both run the real scraper here over a temporary folder, with LinkedIn a
// stand-in that records whether it was asked: no request goes anywhere.
describe('LinkedIn in the server\'s refreshes', () => {
  const NOW = Date.parse('2026-09-30T12:00:00.000Z')
  const HOUR = 60 * 60 * 1000
  const rules = { includeKeywords: ['software'], excludeKeywords: [], locations: ['remote'], internshipOnly: true }

  function withLinkedin(store) {
    const li = { name: 'linkedin', outcome: { answered: 10, refusal: null }, fetch: vi.fn(async () => []) }
    const other = { name: 'internshala', fetch: vi.fn(async () => []) }
    const scraper = { runScrape: (opts) => runScrape({ ...opts, config: { companies: {}, rules }, adapters: [other, li], http: () => { throw new Error('network') }, now: () => NOW }) }
    return { li, run: scrapeRunner(store, { userId: 'local', load: async () => scraper }) }
  }

  it('switched off in Settings, neither the Refresh button nor the daily refresh asks LinkedIn anything', async () => {
    const store = openStore(dir)
    const { li, run } = withLinkedin(store)
    const { post, put, scrape } = await makeApp({ store, run })
    await put({ linkedin: false })
    await post()
    await vi.waitFor(() => expect(scrape.job.isRunning()).toBe(false))
    expect(scrape.job.state().result).toMatchObject({ failed: [], skipped: [] })
    const check = startAutoRefresh({ scrape, userId: 'local', now: () => Date.now() + 25 * HOUR, timers: { after: vi.fn(), every: vi.fn() } })
    expect(await check()).toBe(true)
    await vi.waitFor(() => expect(scrape.job.isRunning()).toBe(false))
    expect(store.runs.all()).toHaveLength(2)
    expect(li.fetch).not.toHaveBeenCalled()
    expect(store.linkedinGuard.get()).toBeNull()
  })

  it('reads LinkedIn once, then skips it inside 20 hours as a note, not a failure', async () => {
    const store = openStore(dir)
    const { li, run } = withLinkedin(store)
    const { post, get, scrape } = await makeApp({ store, run, now: () => NOW + 5 * HOUR })
    await post()
    await vi.waitFor(() => expect(scrape.job.isRunning()).toBe(false))
    expect(li.fetch).toHaveBeenCalledTimes(1)
    await post()
    await vi.waitFor(() => expect(scrape.job.isRunning()).toBe(false))
    expect(li.fetch).toHaveBeenCalledTimes(1)
    const state = (await get('/api/scrape')).json()
    const skipped = [{ name: 'linkedin', note: expect.stringMatching(/^LinkedIn read .* ago; next after .*/) }]
    expect(state.result).toMatchObject({ failed: [], skipped })
    expect(state.lastRun).toMatchObject({ sources: 1, failed: [], skipped })
    expect(state.linkedin).toEqual({ lastSweepAt: new Date(NOW).toISOString(), pausedUntil: null, nextAfter: new Date(NOW + 20 * HOUR).toISOString() })
  })
})
