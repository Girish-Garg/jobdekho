import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { google } from '@jobdekho/sources/companies/google.js'
import { jobsFromPage } from '@jobdekho/sources/companies/google-page.js'
import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'

// The results page as www.google.com/about/careers/applications/jobs/results
// served it on 2026-09-30, trimmed to its two data callbacks (ds:0 the hiring
// companies, ds:1 the jobs) with two jobs and their text replaced. The JSON
// is escaped the way the live page escapes it (<, =).
const PAGE = readFileSync(new URL('./fixtures/google-results.html', import.meta.url), 'utf8')
const RULES = JSON.parse(readFileSync(new URL('../../../config/filters.json', import.meta.url), 'utf8'))

function fakeGoogle(page = PAGE, { fail } = {}) {
  const calls = []
  const http = async (url, opts = {}) => {
    calls.push({ url, opts })
    if (fail) throw new Error(fail)
    return { text: async () => page }
  }
  return { http, calls }
}

describe('google adapter', () => {
  it('reads one page, filtered to India and sorted by date, never a paged URL', async () => {
    const fake = fakeGoogle()
    await google().fetch(fake.http)
    expect(fake.calls).toHaveLength(1)
    const url = new URL(fake.calls[0].url)
    expect(url.pathname).toBe('/about/careers/applications/jobs/results')
    expect(url.searchParams.get('location')).toBe('India')
    expect(url.searchParams.get('sort_by')).toBe('date')
    // robots.txt disallows results?*&page= for every agent
    expect(url.searchParams.has('page')).toBe(false)
  })

  it('maps a job to RawPosting', async () => {
    const [r] = await google().fetch(fakeGoogle().http)
    expect(r.externalId).toBe('137600000000000001')
    expect(r.title).toBe('Software Engineer III, Payments')
    expect(r.company).toBe('Google')
    expect(r.location).toBe('Bengaluru, Karnataka, India / Hyderabad, Telangana, India')
    expect(r.url).toBe('https://www.google.com/about/careers/applications/jobs/results/137600000000000001-software-engineer-iii-payments')
    expect(r.postedAt).toBe(new Date(1790764690 * 1000).toISOString())
    expect(r.level).toBeUndefined()
    expect(r.type).toBeUndefined()
  })

  it('folds about, qualifications and responsibilities into a plain-text body', async () => {
    const [r] = await google().fetch(fakeGoogle().http)
    expect(r.description).toContain('Payments builds the checkout every product uses.')
    expect(r.description).toContain("Bachelor's degree or equivalent practical experience.")
    expect(r.description).toContain('Responsibilities\n\n- Write and test code for the payments service.')
    expect(r.description).not.toMatch(/<\/?(p|ul|li|h3)>|&#39;|\\u003c/)
  })

  it('keeps the hiring company the page names', async () => {
    const out = await google().fetch(fakeGoogle().http)
    expect(out[1].company).toBe('YouTube')
    expect(out[1].url).toMatch(/137600000000000002-senior-engineering-manager-ai-ml-youtube$/)
  })

  it('passes core normalize and the default filters', async () => {
    const [r] = await google().fetch(fakeGoogle().http)
    const p = normalize(r, 'google')
    expect(p.degreeMin).toBe('bachelors')
    expect(filter(p, RULES)).toBe(true)
  })

  it('fails loudly when the page no longer embeds a job list', async () => {
    const bare = '<html><body><script>AF_initDataCallback({key: \'ds:0\', hash: \'1\', data:[[["projects/x","DeepMind","deepmind"]]], sideChannel: {}});</script></body></html>'
    await expect(google().fetch(fakeGoogle(bare).http)).rejects.toThrow('no job list')
  })

  it('reads an embedded empty list as no postings', () => {
    const empty = "<script>AF_initDataCallback({key: 'ds:1', hash: '2', data:[[],null,0,20], sideChannel: {}});</script>"
    expect(jobsFromPage(empty)).toEqual([])
  })

  it('stops for the run on a 429', async () => {
    const adapter = google()
    const fake = fakeGoogle(PAGE, { fail: 'HTTP 429 for https://www.google.com/about/careers' })
    await expect(adapter.fetch(fake.http)).rejects.toThrow('429')
    await expect(adapter.fetch(fake.http)).rejects.toThrow('429')
    expect(fake.calls).toHaveLength(1)
  })
})
