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
})
