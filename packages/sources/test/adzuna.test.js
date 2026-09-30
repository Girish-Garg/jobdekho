import { describe, it, expect, afterEach, vi } from 'vitest'
import { adzuna, toRaw } from '@jobdekho/sources/boards/adzuna.js'
import { searchUrl, PAGES, PER_PAGE } from '@jobdekho/sources/boards/adzuna-url.js'
import { createHttp, redactUrl } from '@jobdekho/sources/http.js'

const job = (id) => ({
  id,
  title: 'Backend Developer',
  company: { display_name: 'Acme India' },
  location: { display_name: 'Bengaluru, Karnataka' },
  redirect_url: `https://www.adzuna.in/land/ad/${id}`,
  description: '<p>Build &amp; ship services</p>',
  category: { label: 'IT Jobs' },
  created: '2026-08-14T09:00:00Z',
  salary_min: 900000,
  salary_max: 1400000,
})
const fixture = { results: [job(4812345678)] }
const page = (n) => ({ results: Array.from({ length: n }, (_, i) => job(i + 1)) })
const answering = (...bodies) => vi.fn(async () => ({ json: async () => bodies.shift() ?? { results: [] } }))
const KEYS = { appId: 'id123', appKey: 'secretkey0000000000000000001a2b' }

afterEach(() => {
  delete process.env.ADZUNA_APP_ID
  delete process.env.ADZUNA_APP_KEY
})

describe('adzuna adapter', () => {
  it('names itself by country', () => {
    expect(adzuna().name).toBe('adzuna:in')
  })

  // Missing keys must surface as a per-source failure the runner records, not a
  // silent empty result that looks like the board simply had no jobs.
  it('throws when credentials are absent, naming both ways to add them', async () => {
    const http = answering(fixture)
    await expect(adzuna().fetch(http)).rejects.toThrow(/Settings.*ADZUNA_APP_ID/)
    expect(http).not.toHaveBeenCalled()
  })

  it('maps results, reading the environment when built with no key', async () => {
    process.env.ADZUNA_APP_ID = 'id'
    process.env.ADZUNA_APP_KEY = 'key'
    const raws = await adzuna().fetch(answering(fixture))
    expect(raws).toHaveLength(1)
    expect(raws[0]).toMatchObject({
      externalId: '4812345678',
      title: 'Backend Developer',
      company: 'Acme India',
      location: 'Bengaluru, Karnataka',
      url: 'https://www.adzuna.in/land/ad/4812345678',
      tags: ['IT Jobs'],
    })
    expect(raws[0].description).toContain('Build')
    expect(raws[0].description).not.toContain('<p>')
  })

  it('uses the key it is given over the environment', async () => {
    process.env.ADZUNA_APP_ID = 'envid'
    process.env.ADZUNA_APP_KEY = 'envkey'
    const http = answering(fixture)
    await adzuna({ keys: KEYS }).fetch(http)
    expect(http.mock.calls[0][0]).toContain(`app_key=${KEYS.appKey}`)
    expect(http.mock.calls[0][0]).not.toContain('envkey')
  })

  // The free tier is 250 requests a day and 2,500 a month, so a run is capped.
  it('asks for at most PAGES full pages, one after another', async () => {
    const http = answering(page(PER_PAGE), page(PER_PAGE), page(PER_PAGE), page(PER_PAGE))
    const raws = await adzuna({ keys: KEYS }).fetch(http)
    expect(http).toHaveBeenCalledTimes(PAGES)
    expect(raws).toHaveLength(PAGES * PER_PAGE)
    expect(http.mock.calls.map(([url]) => url.match(/search\/(\d+)/)[1])).toEqual(['1', '2', '3'])
  })

  it('stops at the first short page rather than spend a request on an empty one', async () => {
    const http = answering(page(PER_PAGE), page(7))
    expect(await adzuna({ keys: KEYS }).fetch(http)).toHaveLength(PER_PAGE + 7)
    expect(http).toHaveBeenCalledTimes(2)
  })

  // A bad key fails the first page: it has to read as this source failing.
  it('fails the source when the first page fails', async () => {
    const http = vi.fn(async () => { throw new Error('HTTP 401 for https://api.adzuna.com/x?app_key=REDACTED') })
    await expect(adzuna({ keys: KEYS }).fetch(http)).rejects.toThrow(/HTTP 401/)
    expect(http).toHaveBeenCalledTimes(1)
  })

  it('keeps the pages that came back when a later one fails', async () => {
    let n = 0
    const http = vi.fn(async () => {
      n += 1
      if (n === 2) throw new Error('HTTP 503')
      return { json: async () => page(PER_PAGE) }
    })
    expect(await adzuna({ keys: KEYS }).fetch(http)).toHaveLength(PER_PAGE)
    expect(http).toHaveBeenCalledTimes(2)
  })

  // What a run stores in runs.ndjson and prints is the thrown message.
  it('never lets the key into the error a run records', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 401 }))
    const err = await adzuna({ keys: KEYS }).fetch(createHttp({ fetchImpl })).catch((e) => e)
    expect(err.message).toMatch(/HTTP 401/)
    expect(err.message).not.toContain(KEYS.appKey)
    expect(err.message).not.toContain(KEYS.appId)
  })
})

describe('searchUrl', () => {
  it('asks India for recent software postings, newest first, a full page at a time', () => {
    const url = new URL(searchUrl({ page: 2, ...KEYS }))
    expect(url.pathname).toBe('/v1/api/jobs/in/search/2')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      app_id: 'id123', app_key: KEYS.appKey, results_per_page: '50', what: 'software developer',
      max_days_old: '60', sort_by: 'date',
    })
  })

  it('is fully covered by the redaction every thrown HTTP error goes through', () => {
    const out = redactUrl(searchUrl({ ...KEYS, perPage: 1 }))
    expect(out).toContain('app_id=REDACTED')
    expect(out).toContain('app_key=REDACTED')
    expect(out).not.toContain(KEYS.appKey)
    expect(out).toContain('what=software%20developer')
  })
})

describe('adzuna salary', () => {
  it('formats a range', () => {
    expect(toRaw(fixture.results[0]).stipend).toBe('9,00,000 - 14,00,000 /year')
  })

  it('formats a single figure', () => {
    expect(toRaw({ id: 1, salary_min: 500000, salary_max: 500000 }).stipend).toBe('5,00,000 /year')
  })

  it('reports nothing when the salary is absent', () => {
    expect(toRaw({ id: 1 }).stipend).toBeNull()
  })
})
