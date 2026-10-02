import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
import { blockCompany } from '@jobdekho/store/blocked-companies.js'
import { runScrape } from '../src/scrape.js'
import { readScrapeConfig } from '../src/config.js'

// Every test here runs against a temporary data folder and adapters that
// answer from memory: nothing reaches the network or the real data folder.
let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-scrape-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const config = {
  companies: {},
  rules: { includeKeywords: ['software'], excludeKeywords: [], locations: ['remote'], internshipOnly: true },
}
const job = (id) => ({ externalId: id, title: 'Software Intern', company: 'Acme', url: `u/${id}`, location: 'Remote' })
const board = (name, jobs) => ({ name, fetch: async () => jobs })
const down = (name) => ({ name, fetch: async () => { throw new Error('offline') } })
const noHttp = () => { throw new Error('a test reached the network') }

describe('runScrape', () => {
  // Workday and the other list-then-describe adapters leave out what the store
  // already holds. The posting was still listed, so it has to count as seen,
  // or the feed hides it as stale after 21 days while it is still open.
  it('marks a posting skipped as already known as seen', async () => {
    const db = openStore(dir)
    const described = { ...job('1'), description: 'Build software for our customers.' }
    await runScrape({ db, config, http: noHttp, adapters: [board('a', [described])] })
    const first = db.corpus.rows()[0].lastSeenAt
    await new Promise((resolve) => setTimeout(resolve, 5))
    const skipper = { name: 'a', fetch: async (http, context) => (context.known('a', '1') ? [] : [described]) }
    await runScrape({ db, config, http: noHttp, adapters: [skipper] })
    expect(db.corpus.rows()[0].lastSeenAt > first).toBe(true)
  })

  it('fetches every source, writes the new postings and the run into the store, and returns both', async () => {
    const db = openStore(dir)
    const out = await runScrape({ db, config, http: noHttp, retryDelayMs: 0, adapters: [board('a', [job('1'), job('2')]), down('b')] })
    expect(out).toMatchObject({ fresh: 2, total: 2, tooOld: 0, removed: 0 })
    expect(out.results.map((r) => [r.name, r.ok])).toEqual([['a', true], ['b', false]])
    expect(db.corpus.rows()).toHaveLength(2)
    const [run] = db.runs.all()
    expect(run).toMatchObject({ newCount: 2, sourceResults: [{ name: 'a', ok: true }, { name: 'b', ok: false, error: 'offline' }] })
  })

  it('counts a posting already stored as relevant but not new', async () => {
    const db = openStore(dir)
    await runScrape({ db, config, http: noHttp, adapters: [board('a', [job('1')])] })
    const again = await runScrape({ db, config, http: noHttp, adapters: [board('a', [job('1'), job('3')])] })
    expect(again).toMatchObject({ fresh: 1, total: 2 })
    expect(db.runs.all()).toHaveLength(2)
  })

  it('reports progress: the total before any fetch, then each source as it settles', async () => {
    const heard = []
    await runScrape({ db: openStore(dir), config, http: noHttp, retryDelayMs: 0, adapters: [board('a', []), down('b')], onProgress: (p) => heard.push(p) })
    expect(heard[0]).toEqual({ done: 0, total: 2, current: null })
    expect(heard.slice(1).map((p) => p.done)).toEqual([1, 2])
    expect(heard.slice(1).map((p) => p.current).sort()).toEqual(['a', 'b'])
  })
})

describe('readScrapeConfig', () => {
  // The repo's own config files, the ones `npm run scrape` reads.
  it('reads the sources and the relevance rules from the config folder', () => {
    const { companies, rules } = readScrapeConfig()
    expect(Array.isArray(companies.providers)).toBe(true)
    expect(Array.isArray(rules.includeKeywords)).toBe(true)
  })

  // LinkedIn fetches a job's description once; the run tells it which it
  // may skip: ones the store already describes, and ones the filter drops.
  it('tells adapters which postings are already described and which the filter keeps', async () => {
    const db = openStore(dir)
    await runScrape({ db, config, http: noHttp, adapters: [board('a', [{ ...job('1'), description: 'Build the thing.' }])] })
    let seen
    const asking = { name: 'a', fetch: async (http, context) => { seen = context; return [] } }
    await runScrape({ db, config, http: noHttp, adapters: [asking] })
    expect(seen.known('a', '1')).toBe(true)
    expect(seen.known('a', '2')).toBe(false)
    expect(seen.wanted('a', job('3'))).toBe(true)
    expect(seen.wanted('a', { ...job('4'), title: 'Chef' })).toBe(false)
  })
})

describe('runScrape across runs', () => {
  const at = (iso) => () => Date.parse(iso)
  const quiet = { retryDelayMs: 0, checkHttp: noHttp }

  // A complete source lists everything it has: one it stops listing twice in
  // a row is closed, deleted, and kept only where the person saved it.
  it('closes a posting a complete source stopped listing, keeping a saved one closed', async () => {
    const db = openStore(dir)
    const both = { name: 'g', complete: true, fetch: async () => [job('1'), job('2')] }
    const one = { name: 'g', complete: true, fetch: async () => [job('1')] }
    await runScrape({ db, config, http: noHttp, adapters: [both], now: at('2026-09-01T00:00:00Z'), ...quiet })
    db.statuses.set('local', {})
    await runScrape({ db, config, http: noHttp, adapters: [one], now: at('2026-09-02T00:00:00Z'), ...quiet })
    expect(db.corpus.rows()).toHaveLength(2)
    const third = await runScrape({ db, config, http: noHttp, adapters: [one], now: at('2026-09-03T00:00:00Z'), ...quiet })
    expect(third.closed).toBe(1)
    expect(db.corpus.rows().map((r) => r.externalId)).toEqual(['1'])
    const [run] = db.runs.all().slice(-1)
    expect(run).toMatchObject({ closed: 1, checked: 0 })
  })

  // A board that answers 304 sent nothing, yet everything it listed is
  // still listed: without that the feed would hide it after 21 days.
  it('remembers a board\'s ETag, sends it, and counts an unchanged board\'s postings as seen', async () => {
    const db = openStore(dir)
    const { greenhouse } = await import('@jobdekho/sources/providers/greenhouse.js')
    const sent = []
    const http = async (url, options = {}) => {
      sent.push(options.headers?.['If-None-Match'] ?? null)
      if (options.headers?.['If-None-Match'] === 'W/"v1"') return { status: 304 }
      const jobs = [{ id: 7, title: 'Software Intern', location: { name: 'Remote' }, absolute_url: 'https://job-boards.greenhouse.io/acme/jobs/7' }]
      return { status: 200, headers: new Headers({ etag: 'W/"v1"' }), json: async () => ({ jobs }) }
    }
    await runScrape({ db, config, http, adapters: [greenhouse({ slug: 'acme' })], ...quiet })
    const first = db.corpus.rows()[0].lastSeenAt
    await new Promise((resolve) => setTimeout(resolve, 5))
    const second = await runScrape({ db, config, http, adapters: [greenhouse({ slug: 'acme' })], ...quiet })
    expect(sent).toEqual([null, 'W/"v1"'])
    expect(second.results[0]).toMatchObject({ name: 'greenhouse:acme', ok: true, unchanged: true, complete: true })
    expect(db.corpus.rows()[0].lastSeenAt > first).toBe(true)
  })

  it('rests a source after three failed runs and lists it as skipped with why', async () => {
    const db = openStore(dir)
    for (let i = 0; i < 3; i++) await runScrape({ db, config, http: noHttp, adapters: [down('b')], ...quiet })
    let asked = false
    const out = await runScrape({ db, config, http: noHttp, adapters: [{ name: 'b', fetch: async () => { asked = true; return [] } }], ...quiet })
    expect(asked).toBe(false)
    expect(out.results).toEqual([expect.objectContaining({ name: 'b', skipped: true, paused: true })])
  })

  // A posting no source has shown for days has its own link checked, only
  // where robots.txt allows, and closes if the link says it is gone.
  it('closes a posting whose own link is gone', async () => {
    const db = openStore(dir)
    const posting = { ...job('9'), url: 'https://internshala.com/internship/detail/x1790682829' }
    await runScrape({ db, config, http: noHttp, adapters: [board('internshala', [posting])], ...quiet })
    const checkHttp = async (url) => (url.endsWith('/robots.txt')
      ? { status: 404, text: async () => '' }
      : { status: 404, headers: new Headers(), text: async () => '' })
    const out = await runScrape({ db, config, http: noHttp, checkHttp, retryDelayMs: 0, adapters: [board('internshala', [])], now: () => Date.now() + 6 * 86400000 })
    expect(out).toMatchObject({ closed: 1, checked: 1 })
    expect(db.corpus.rows()).toHaveLength(0)
  })
})

// A company the person blocked in Settings, read from the store by the run
// itself, as `npm run scrape` does (see index.js): no argument says so.
describe('runScrape and blocked companies', () => {
  const quiet = { retryDelayMs: 0, checkHttp: noHttp, env: {} }
  const at = (id, company) => ({ ...job(id), company })

  // The real adapters, built from the config the way every refresh builds
  // them, against an http that answers every board from memory. Acme
  // Foundation's board is known only by its slug, as many are.
  const companies = { providers: [{ provider: 'greenhouse', slug: 'acmefoundation' }, { provider: 'greenhouse', slug: 'beta' }] }
  const boardsAsked = () => {
    const asked = []
    const http = async (url) => {
      asked.push(url)
      const jobs = [{ id: asked.length, title: 'Software Intern', location: { name: 'Remote' }, absolute_url: `https://x/${asked.length}` }]
      return { status: 200, headers: new Headers(), json: async () => ({ jobs }) }
    }
    return { asked, http }
  }
  const BOARD = (slug) => `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`

  it('never reads a blocked company\'s own careers page when told to stop, and still reads the rest', async () => {
    const db = openStore(dir)
    blockCompany(db, 'local', { name: 'Acme Foundation', stopFetching: true })
    const { asked, http } = boardsAsked()
    const out = await runScrape({ db, userId: 'local', config: { ...config, companies }, http, ...quiet })
    expect(asked).toEqual([BOARD('beta')])
    expect(out.results.map((r) => r.name)).toEqual(['greenhouse:beta'])
    expect(db.corpus.rows().map((r) => r.company)).toEqual(['Beta'])
  })

  // Without "stop fetching" its page is read with the rest, and its jobs are
  // dropped there like a job board's.
  it('reads a blocked company\'s careers page when not told to stop, keeping none of its jobs', async () => {
    const db = openStore(dir)
    blockCompany(db, 'local', { name: 'Acme Foundation', stopFetching: false })
    const { asked, http } = boardsAsked()
    const out = await runScrape({ db, userId: 'local', config: { ...config, companies }, http, ...quiet })
    expect([...asked].sort()).toEqual([BOARD('acmefoundation'), BOARD('beta')])
    expect(db.corpus.rows().map((r) => r.company)).toEqual(['Beta'])
    expect(out.blocked).toBe(1)
  })

  it('drops a blocked company\'s postings from a job board, under any spelling, and keeps the rest', async () => {
    const db = openStore(dir)
    blockCompany(db, 'local', { name: 'Fake Corp' })
    const out = await runScrape({ db, userId: 'local', config, http: noHttp, adapters: [board('internshala', [at('1', 'FAKE CORP PVT LTD'), at('2', 'Real Co')])], ...quiet })
    expect(db.corpus.rows().map((r) => r.company)).toEqual(['Real Co'])
    expect(out).toMatchObject({ fresh: 1, total: 1, blocked: 1 })
  })

  // What is already stored stays, for the feed to hide, and is still counted
  // as listed rather than closed, so unblocking brings it back as it was.
  it('leaves a blocked company\'s stored postings where they are', async () => {
    const db = openStore(dir)
    const listing = board('internshala', [at('1', 'Fake Corp'), at('2', 'Real Co')])
    await runScrape({ db, userId: 'local', config, http: noHttp, adapters: [listing], ...quiet })
    blockCompany(db, 'local', { name: 'Fake Corp' })
    await runScrape({ db, userId: 'local', config, http: noHttp, adapters: [{ ...listing, complete: true }], ...quiet })
    await runScrape({ db, userId: 'local', config, http: noHttp, adapters: [{ ...listing, complete: true }], ...quiet })
    expect(db.corpus.rows().map((r) => [r.company, r.closedAt ?? null])).toEqual([['Fake Corp', null], ['Real Co', null]])
  })

  it('blocks nothing for a run with no user to ask', async () => {
    const db = openStore(dir)
    blockCompany(db, 'local', { name: 'Fake Corp' })
    await runScrape({ db, config, http: noHttp, adapters: [board('internshala', [at('1', 'Fake Corp')])], ...quiet })
    expect(db.corpus.rows()).toHaveLength(1)
  })
})
