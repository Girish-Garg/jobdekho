import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
import { createDescriber, LINKEDIN_OFF } from '../src/describe-turn.js'

// A temporary data folder, a fake clock and a fake http: nothing here
// reaches LinkedIn, SmartRecruiters or the real data folder, and nothing
// sleeps.
let dir
let db
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'jobdekho-describe-'))
  db = openStore(dir)
})
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const NOW = Date.parse('2026-10-04T12:00:00.000Z')
const HOUR = 60 * 60 * 1000
const view = readFileSync(new URL('../../../packages/sources/test/fixtures/linkedin-job-view.html', import.meta.url), 'utf8')
const card = { id: 'li1', source: 'linkedin', externalId: '4400000001', title: 'Software Engineer Intern' }
const sr = { id: 'sr1', source: 'smartrecruiters:BoschGroup', externalId: '7440001', title: 'HW Developer' }
const linkedinSwitch = (on) => db.scrapeSettings.set('local', { autoRefresh: true, linkedin: on })

function fakeHttp(answer) {
  const calls = []
  const http = vi.fn(async (url) => {
    calls.push(url)
    return answer(url)
  })
  return { http, calls }
}
const page = (html) => () => ({ url: 'https://www.linkedin.com/x', text: async () => html })
const describer = (http, now = NOW) => createDescriber(db, { http, now: () => now, wait: async () => {}, random: () => 0 })

describe('describing a LinkedIn posting', () => {
  it('refuses with a clear sentence, and no request, while LinkedIn is switched off', async () => {
    const { http, calls } = fakeHttp(page(view))
    expect(await describer(http)('local', card)).toEqual({ status: 403, error: LINKEDIN_OFF })
    linkedinSwitch(false)
    expect((await describer(http)('local', card)).status).toBe(403)
    expect(calls).toEqual([])
  })

  it('reads the posting once it is switched on', async () => {
    linkedinSwitch(true)
    const { http, calls } = fakeHttp(page(view))
    const { page: got } = await describer(http)('local', card)
    expect(calls).toEqual(['https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/4400000001'])
    expect(got.description).toContain('Northwind Labs')
    expect(got.level).toBe('internship')
  })

  it('leaves LinkedIn alone while its guard is paused', async () => {
    linkedinSwitch(true)
    db.linkedinGuard.set({ lastSweepAt: null, pausedUntil: new Date(NOW + 5 * HOUR).toISOString(), refusals: 1 })
    const { http, calls } = fakeHttp(page(view))
    const out = await describer(http)('local', card)
    expect(out.status).toBe(429)
    expect(out.error).toMatch(/left alone until/)
    expect(calls).toEqual([])
  })

  // A refusal pauses the next sweep too, the way a sweep's own refusal does.
  it('records a refusal in the guard', async () => {
    linkedinSwitch(true)
    const { http } = fakeHttp(() => { throw new Error('HTTP 429 for https://www.linkedin.com/x') })
    const out = await describer(http)('local', card)
    expect(out.status).toBe(429)
    const guard = db.linkedinGuard.get()
    expect(guard.refusals).toBe(1)
    expect(Date.parse(guard.pausedUntil)).toBeGreaterThan(NOW)
  })
})

describe('describing a SmartRecruiters posting', () => {
  const detail = () => ({ json: async () => ({ jobAd: { sections: { jobDescription: { title: 'Job Description', text: '<p>Design boards.</p>' } } } }) })

  it('reads its public detail, with LinkedIn off', async () => {
    const { http, calls } = fakeHttp(detail)
    const { page: got } = await describer(http)('local', sr)
    expect(calls).toEqual(['https://api.smartrecruiters.com/v1/companies/BoschGroup/postings/7440001'])
    expect(got.description).toContain('Design boards.')
  })

  // A failed fetch is one request, not one per reopening.
  it('does not ask again the same day after a failure, and does the next day', async () => {
    const { http, calls } = fakeHttp(() => { throw new Error('HTTP 500 for x') })
    const once = describer(http)
    expect((await once('local', sr)).status).toBe(502)
    expect((await once('local', sr)).status).toBe(409)
    expect(calls).toHaveLength(1)
    const later = createDescriber(db, { http, now: () => NOW + 25 * HOUR })
    expect((await later('local', sr)).status).toBe(502)
    expect(calls).toHaveLength(2)
  })

  it('treats an empty description as a failure', async () => {
    const { http } = fakeHttp(() => ({ json: async () => ({ jobAd: { sections: {} } }) }))
    expect((await describer(http)('local', sr)).status).toBe(502)
  })
})

describe('a board with nothing to fetch', () => {
  it('refuses without a request', async () => {
    const { http, calls } = fakeHttp(page(view))
    const out = await describer(http)('local', { id: 'i1', source: 'instahyre', externalId: '1' })
    expect(out.status).toBe(409)
    expect(calls).toEqual([])
  })
})
