import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
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
    const out = await runScrape({ db, config, http: noHttp, adapters: [board('a', [job('1'), job('2')]), down('b')] })
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
    await runScrape({ db: openStore(dir), config, http: noHttp, adapters: [board('a', []), down('b')], onProgress: (p) => heard.push(p) })
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
