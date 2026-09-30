import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore, FILES } from '@jobdekho/store/open.js'
import { recordRun } from '@jobdekho/store/queries.js'
import { lastRunReader, summarizeRun } from '@jobdekho/server/scrape/last-run.js'
import { readRefreshPref, saveRefreshPref, normalizeRefreshPref } from '@jobdekho/server/scrape/prefs.js'
import { scrapeRunner } from '@jobdekho/server/scrape/run.js'
import { createScrapeService } from '@jobdekho/server/scrape/service.js'

// A temporary data folder per test: the real one is never read or written.
let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-scrape-svc-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const sources = [
  { name: 'internshala', ok: true, count: 40, error: null },
  { name: 'greenhouse:acme', ok: false, count: 0, error: 'HTTP 404 for https://boards.example/acme' },
]

describe('the last completed run', () => {
  it('is null before any scrape has run', () => {
    expect(lastRunReader(join(dir, FILES.runs))()).toBeNull()
  })

  it('is the newest line, summarised: when, how many new, and which sources failed', async () => {
    const store = openStore(dir)
    const read = lastRunReader(store.runs.path)
    await recordRun(store, { id: 'r1', sourceResults: sources, newCount: 3 })
    expect(read()).toMatchObject({ fresh: 3, sources: 2 })
    await recordRun(store, { id: 'r2', sourceResults: sources, newCount: 37 })
    const last = read()
    expect(last).toEqual({ at: expect.any(String), fresh: 37, sources: 2, failed: [{ name: 'greenhouse:acme', error: sources[1].error }] })
    expect(Number.isNaN(Date.parse(last.at))).toBe(false)
  })

  it('reads a run another process appended, such as `npm run scrape`', async () => {
    const read = lastRunReader(join(dir, FILES.runs))
    expect(read()).toBeNull()
    await recordRun(openStore(dir), { id: 'cli', sourceResults: [], newCount: 5 })
    expect(read()).toMatchObject({ fresh: 5, sources: 0, failed: [] })
  })

  it('reads a last line broken by hand as no run rather than failing', () => {
    writeFileSync(join(dir, FILES.runs), '{"id":"r1","newCount":1}\n{broken\n')
    expect(lastRunReader(join(dir, FILES.runs))()).toBeNull()
  })

  it('summarises a run from before a field existed without throwing', () => {
    expect(summarizeRun({ id: 'old' })).toEqual({ at: null, fresh: 0, sources: 0, failed: [] })
  })
})

describe('the auto-refresh preference', () => {
  it('is on until the person turns it off, and is kept in its own file', () => {
    const store = openStore(dir)
    expect(readRefreshPref(store, 'local')).toEqual({ autoRefresh: true })
    saveRefreshPref(store, 'local', { autoRefresh: false })
    expect(existsSync(join(dir, FILES.scrapeSettings))).toBe(true)
    expect(readRefreshPref(openStore(dir), 'local')).toEqual({ autoRefresh: false })
  })

  it('reads anything but a real boolean as the default', () => {
    expect(normalizeRefreshPref({ autoRefresh: 'no' })).toEqual({ autoRefresh: true })
    expect(normalizeRefreshPref(null)).toEqual({ autoRefresh: true })
  })

  it('is the default when there is no user to read it for', () => {
    expect(readRefreshPref(openStore(dir), null)).toEqual({ autoRefresh: true })
  })
})

describe('scrapeRunner', () => {
  it('runs the scraper into the store it was given and keeps only what the browser is shown', async () => {
    const store = openStore(dir)
    const runScrape = vi.fn(async ({ onProgress }) => {
      onProgress({ done: 1, total: 2, current: 'internshala' })
      return { fresh: 3, total: 40, tooOld: 1, removed: 2, freshPostings: [{ id: 'x' }], results: sources }
    })
    const onProgress = vi.fn()
    const out = await scrapeRunner(store, { load: async () => ({ runScrape }) })({ onProgress })
    expect(runScrape.mock.calls[0][0].db).toBe(store)
    expect(onProgress).toHaveBeenCalledWith({ done: 1, total: 2, current: 'internshala' })
    expect(out).toEqual({ fresh: 3, total: 40, tooOld: 1, removed: 2, failed: ['greenhouse:acme'] })
  })

  // Only the import is checked here; the scrape itself is never run.
  it('finds the scraper through its workspace package', async () => {
    const mod = await import('@jobdekho/scraper/scrape.js')
    expect(typeof mod.runScrape).toBe('function')
  })
})

describe('createScrapeService', () => {
  it('shares one job, the last run and the preference over one store', async () => {
    const store = openStore(dir)
    const run = vi.fn(async () => {
      await recordRun(store, { id: 'r', sourceResults: sources, newCount: 9 })
      return { fresh: 9, total: 9, tooOld: 0, removed: 0, failed: [] }
    })
    const scrape = createScrapeService(store, { run })
    await scrape.job.start()
    expect(scrape.job.state().result).toMatchObject({ fresh: 9 })
    expect(scrape.lastRun()).toMatchObject({ fresh: 9 })
    scrape.setPref('local', { autoRefresh: false })
    expect(scrape.getPref('local')).toEqual({ autoRefresh: false })
  })
})
