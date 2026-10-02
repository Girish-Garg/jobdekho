import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
import { linkedin } from '@jobdekho/sources/boards/linkedin.js'
import { FIRST_SWEEP, DAILY_SWEEP } from '@jobdekho/sources/boards/linkedin-plan.js'
import { runScrape } from '../src/scrape.js'
import { linkedinOn, linkedinChoice } from '../src/linkedin-setting.js'

// A temporary data folder, a fake clock, and LinkedIn either as a stand-in
// adapter or as the real one over a fake http: nothing here reaches
// LinkedIn, the network or the real data folder, and nothing sleeps.
let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-linkedin-turn-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const NOW = Date.parse('2026-09-30T12:00:00.000Z')
const HOUR = 60 * 60 * 1000
const at = (ms) => new Date(ms).toISOString()
const config = { companies: {}, rules: { includeKeywords: ['software'], excludeKeywords: [], locations: ['india'] } }
const noHttp = vi.fn(() => { throw new Error('a test reached the network') })
const other = () => ({ name: 'internshala', fetch: vi.fn(async () => []) })
const standIn = (outcome = { answered: 12, refusal: null }) => {
  const adapter = { name: 'linkedin', outcome: null, context: null }
  adapter.fetch = vi.fn(async (http, context) => { adapter.context = context; adapter.outcome = outcome; return [] })
  return adapter
}
const scrape = (db, adapters, { now = NOW, http = noHttp } = {}) =>
  runScrape({ db, userId: 'local', env: {}, config, adapters, http, now: () => now })

// A search page of cards with ids no other page shares, as parseLinkedin reads them.
const cards = (n) => [1, 2, 3].map((i) => `<li><div class="base-search-card" data-entity-urn="urn:li:jobPosting:${n * 10 + i}">` +
  `<a class="base-card__full-link" href="https://in.linkedin.com/jobs/view/software-intern-${n * 10 + i}"></a>` +
  `<h3 class="base-search-card__title">Software Intern ${n}</h3></div></li>`).join('')
// `fail(n)` may return an error for the nth request to throw, the way http.js does.
function fakeLinkedin(fail = () => null) {
  const calls = []
  const http = async (url) => {
    calls.push(url)
    const err = fail(calls.length)
    if (err) throw err
    return { url, text: async () => (url.includes('/search') ? cards(calls.length) : '') }
  }
  return { http, calls, searches: () => calls.filter((u) => u.includes('/search')) }
}
const realLinkedin = () => linkedin({ wait: async () => {} })

describe('the Include LinkedIn setting', () => {
  // LinkedIn does not allow automated access, so a fresh install never reads
  // it: only a person who turned it on takes that risk.
  it('is off unless the person turned it on, for whoever the run is for', () => {
    const db = openStore(dir)
    expect(linkedinOn(db, 'local')).toBe(false)
    db.scrapeSettings.set('local', { autoRefresh: true, linkedin: true })
    expect(linkedinOn(db, 'local')).toBe(true)
    expect(linkedinOn(db, 'someone-else')).toBe(false)
    expect(linkedinOn(db, null)).toBe(false)
    expect([linkedinChoice('yes'), linkedinChoice(undefined), linkedinChoice(true)]).toEqual([false, false, true])
  })

  it('off, sends LinkedIn no request at all and leaves the guard alone', async () => {
    const db = openStore(dir)
    db.scrapeSettings.set('local', { autoRefresh: true, linkedin: false })
    const li = fakeLinkedin()
    const adapter = realLinkedin()
    const out = await scrape(db, [other(), adapter], { http: li.http })
    expect(li.calls).toEqual([])
    expect(out.results.map((r) => r.name)).toEqual(['internshala'])
    expect(db.linkedinGuard.get()).toBeNull()
  })

  it('off, also leaves out a LinkedIn the run was already in the middle of skipping', async () => {
    const db = openStore(dir)
    db.linkedinGuard.set({ lastSweepAt: at(NOW - HOUR), pausedUntil: null, refusals: 0 })
    db.scrapeSettings.set('local', { linkedin: false })
    const out = await scrape(db, [standIn()])
    expect(out.results).toEqual([])
  })
})

describe('LinkedIn\'s guard in a scrape', () => {
  // Off unless turned on (see linkedin-setting.js); every run here has it on.
  beforeEach(() => openStore(dir).scrapeSettings.set('local', { linkedin: true }))

  it('reads a month at full size the first time, and records the read', async () => {
    const db = openStore(dir)
    const li = standIn()
    await scrape(db, [other(), li])
    expect(li.fetch).toHaveBeenCalledTimes(1)
    expect(li.context.linkedin).toEqual(FIRST_SWEEP)
    expect(typeof li.context.known).toBe('function')
    expect(db.linkedinGuard.get()).toEqual({ lastSweepAt: at(NOW), pausedUntil: null, refusals: 0 })
  })

  it('skips LinkedIn inside 20 hours, saying so as a note rather than a failure', async () => {
    const db = openStore(dir)
    await scrape(db, [standIn()])
    const li = standIn()
    const out = await scrape(db, [other(), li], { now: NOW + 5 * HOUR })
    expect(li.fetch).not.toHaveBeenCalled()
    const note = 'LinkedIn read 5 h ago; next after 15 h'
    expect(out.results).toEqual([
      { name: 'internshala', ok: true, count: 0, error: null },
      { name: 'linkedin', ok: true, count: 0, error: null, skipped: true, note },
    ])
    expect(db.runs.all()[1].sourceResults[1]).toMatchObject({ name: 'linkedin', skipped: true, note })
    expect(db.linkedinGuard.get().lastSweepAt).toBe(at(NOW))
  })

  it('reads a week at the daily size the next day, through the real adapter', async () => {
    const db = openStore(dir)
    db.linkedinGuard.set({ lastSweepAt: at(NOW - 21 * HOUR), pausedUntil: null, refusals: 0 })
    const li = fakeLinkedin()
    await scrape(db, [realLinkedin()], { http: li.http })
    expect(li.searches()).toHaveLength(DAILY_SWEEP.searches)
    for (const url of li.searches()) expect(url).toContain('f_TPR=r604800')
    expect(li.calls.length - li.searches().length).toBe(DAILY_SWEEP.views)
    expect(db.linkedinGuard.get()).toEqual({ lastSweepAt: at(NOW), pausedUntil: null, refusals: 0 })
  })

  it('pauses LinkedIn for 48 hours after it refuses, and sends nothing while paused', async () => {
    const db = openStore(dir)
    const refusing = fakeLinkedin((n) => (n === 3 ? new Error('HTTP 999 for https://www.linkedin.com/x') : null))
    const out = await scrape(db, [realLinkedin()], { http: refusing.http })
    expect(refusing.calls).toHaveLength(3)
    expect(out.results[0]).toMatchObject({ name: 'linkedin', ok: true, count: 6, note: expect.stringMatching(/refused \(HTTP 999\)/) })
    expect(db.linkedinGuard.get()).toEqual({ lastSweepAt: at(NOW), pausedUntil: at(NOW + 48 * HOUR), refusals: 1 })
    const later = fakeLinkedin()
    const paused = await scrape(db, [realLinkedin()], { http: later.http, now: NOW + 47 * HOUR })
    expect(later.calls).toEqual([])
    expect(paused.results[0]).toMatchObject({ skipped: true, note: expect.stringMatching(/^LinkedIn paused until \w{3} 2 Oct: it refused the last read$/) })
  })

  it('pauses for as long as LinkedIn asked when that is longer', async () => {
    const db = openStore(dir)
    const told = fakeLinkedin(() => Object.assign(new Error('HTTP 429 for https://x'), { retryAfter: String(5 * 24 * 3600) }))
    await scrape(db, [realLinkedin()], { http: told.http })
    expect(db.linkedinGuard.get()).toMatchObject({ pausedUntil: at(NOW + 5 * 24 * HOUR), refusals: 1 })
  })

  it('doubles the pause when LinkedIn refuses again after one', async () => {
    const db = openStore(dir)
    db.linkedinGuard.set({ lastSweepAt: at(NOW - 3 * 24 * HOUR), pausedUntil: at(NOW - HOUR), refusals: 1 })
    await scrape(db, [standIn({ answered: 1, refusal: { reason: 'HTTP 429', retryAfterMs: null } })])
    expect(db.linkedinGuard.get()).toEqual({ lastSweepAt: at(NOW), pausedUntil: at(NOW + 96 * HOUR), refusals: 2 })
  })

  // Offline: the read never happened, so it neither counts nor pauses.
  it('leaves the guard as it was when no request reached LinkedIn', async () => {
    const db = openStore(dir)
    const offline = fakeLinkedin(() => new TypeError('fetch failed'))
    await scrape(db, [realLinkedin()], { http: offline.http })
    expect(offline.calls.length).toBeGreaterThan(0)
    expect(db.linkedinGuard.get()).toEqual({ lastSweepAt: null, pausedUntil: null, refusals: 0 })
  })

  // `npm run scrape` beside the app's own refresh: the second skips LinkedIn.
  it('claims the read before the first request, so a scrape started meanwhile skips it', async () => {
    const db = openStore(dir)
    let second
    const first = standIn()
    first.fetch.mockImplementation(async () => {
      second = await scrape(openStore(dir), [standIn()], { now: NOW + 60 * 1000 })
      first.outcome = { answered: 20, refusal: null }
      return []
    })
    await scrape(db, [first])
    expect(second.results).toEqual([expect.objectContaining({ name: 'linkedin', skipped: true })])
  })

  it('never reads or writes the guard when the config does not list LinkedIn', async () => {
    const db = openStore(dir)
    const out = await scrape(db, [other()])
    expect(out.results.map((r) => r.name)).toEqual(['internshala'])
    expect(existsSync(db.linkedinGuard.path)).toBe(false)
  })
})
