import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { ltimindtree } from '@jobdekho/sources/companies/ltimindtree.js'
import { mphasis } from '@jobdekho/sources/companies/mphasis.js'
import { hdfcbank } from '@jobdekho/sources/companies/hdfcbank.js'
import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'

// Field names and formats as a RippleHire career site's candidatejobsearch
// and candidatejobdetail returned them on 2026-09-30 (LTIMindtree's, with
// Mphasis's country codes in one row), trimmed, ids and text replaced.
const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))
const SEARCH = fixture('ripplehire-search.json')
const DETAIL = fixture('ripplehire-detail.json')
const RULES = JSON.parse(readFileSync(new URL('../../../config/filters.json', import.meta.url), 'utf8'))
const noPause = async () => {}

// Detail replies are built from the captured one, one per listed job.
const detailFor = (seq) => {
  const row = SEARCH.jobVoList.find((r) => r.jobSeq === seq)
  return seq === '898001' ? DETAIL : { ...DETAIL, jobVO: { ...DETAIL.jobVO, jobSeq: seq, jobTitle: row?.jobTitle, locations: row?.locations } }
}

function fakeRipple({ search = () => SEARCH, fail = () => null } = {}) {
  const calls = []
  const http = async (url, opts = {}) => {
    const form = opts.body ? new URLSearchParams(opts.body) : null
    const params = form ? JSON.parse(form.get('careerSiteUrlParams')) : null
    calls.push({ url, method: opts.method || 'GET', params, form, headers: opts.headers })
    const failure = fail(url, params)
    if (failure) throw new Error(failure)
    if (opts.method === 'POST') return { json: async () => search(params) }
    return { json: async () => detailFor(new URL(url).searchParams.get('jobSeq')) }
  }
  return { http, calls }
}

describe('ripplehire adapters', () => {
  it("searches LTIMindtree's India site with its token and geo filter, 50 a page", async () => {
    const fake = fakeRipple()
    await ltimindtree({ pause: noPause }).fetch(fake.http)
    const [first] = fake.calls
    expect(first.url).toBe('https://ltimindtree.ripplehire.com/candidate/candidatejobsearch')
    expect(first.method).toBe('POST')
    expect(first.form.get('lang')).toBe('en')
    expect(first.params).toEqual({ page: 0, search: '*:*', token: 'xviyQvbnyYZdGtozXoNm', source: 'CAREERSITE', pagesize: 50, geo: 'India' })
  })

  it('maps a job and its detail to RawPosting', async () => {
    const [r] = await ltimindtree({ pause: noPause }).fetch(fakeRipple().http)
    expect(r.externalId).toBe('898001')
    expect(r.title).toBe('Specialist - Software Engineering')
    expect(r.company).toBe('LTIMindtree')
    expect(r.location).toBe('Bengaluru, India')
    expect(r.url).toBe('https://ltimindtree.ripplehire.com/candidate/?token=xviyQvbnyYZdGtozXoNm&lang=en&source=CAREERSITE#detail/job/898001')
    expect(r.postedAt).toBe('2026-09-30T11:09:03.000Z')
    expect(r.experience).toBe('5 - 8 Years')
    expect(r.description).toContain('Build services on Spring Boot.')
    expect(r.description).toContain('Skills\n\nMandatory Skills: Java, Spring Boot')
    expect(r.description).not.toMatch(/<p>|<br>/)
    expect(r.level).toBeUndefined()
  })

  it('reads the day alone, pinned to UTC, when the publish time is missing', async () => {
    const detail = { ...DETAIL, jobVO: { ...DETAIL.jobVO, publishDetails: null } }
    const fake = fakeRipple()
    const http = async (url, opts) => (opts?.method === 'POST' ? fake.http(url, opts) : { json: async () => detail })
    const [r] = await ltimindtree({ pause: noPause }).fetch(http)
    expect(r.postedAt).toBe('2026-09-29T00:00:00.000Z')
  })

  it('treats the "Select Location" placeholder as no city', async () => {
    const out = await ltimindtree({ pause: noPause }).fetch(fakeRipple().http)
    expect(out.find((r) => r.externalId === '898002').location).toBe('India')
  })

  it("keeps Mphasis's Indian rows by their country code, with no geo sent", async () => {
    const fake = fakeRipple()
    const out = await mphasis({ pause: noPause }).fetch(fake.http)
    expect(fake.calls[0].url).toBe('https://mphasis.ripplehire.com/candidate/candidatejobsearch')
    expect(fake.calls[0].params.geo).toBeUndefined()
    expect(fake.calls[0].params.token).toBe('ty4DfyWddnOrtpclQeia')
    expect(out.map((r) => r.externalId)).toEqual(['898001', '898002'])
    expect(fake.calls.some((c) => c.url.includes('jobSeq=898003'))).toBe(false)
  })

  it('reads every HDFC Bank row, which the site keeps in India', async () => {
    const fake = fakeRipple()
    const out = await hdfcbank({ pause: noPause }).fetch(fake.http)
    expect(fake.calls[0].params.token).toBe('pvB5iAMcmu4ydUh2IW2O')
    expect(out).toHaveLength(3)
    expect(out[0].company).toBe('HDFC Bank')
  })

  it('pages at 50 and reads two pages at most', async () => {
    const full = { ...SEARCH, jobVoList: Array.from({ length: 50 }, (_, i) => ({ ...SEARCH.jobVoList[0], jobSeq: String(700000 + i) })) }
    const fake = fakeRipple({ search: () => full })
    await ltimindtree({ pause: noPause }).fetch(fake.http, { known: () => true })
    expect(fake.calls.map((c) => c.params?.page)).toEqual([0, 1])
  })

  // Read to its end, the list is every job the site has, so a posting it
  // stops listing can be closed; capped at two pages it may not be, and an
  // empty list could be an outage.
  it('says its list is complete when it was read to the end, and never when empty', async () => {
    const whole = ltimindtree({ pause: noPause })
    await whole.fetch(fakeRipple().http)
    expect(whole.complete).toBe(true)
    const full = { ...SEARCH, jobVoList: Array.from({ length: 50 }, (_, i) => ({ ...SEARCH.jobVoList[0], jobSeq: String(700000 + i) })) }
    const capped = ltimindtree({ pause: noPause })
    await capped.fetch(fakeRipple({ search: () => full }).http, { known: () => true })
    expect(capped.complete).toBe(false)
    const empty = ltimindtree({ pause: noPause })
    await empty.fetch(fakeRipple({ search: () => ({ ...SEARCH, jobVoList: [] }) }).http)
    expect(empty.complete).toBe(false)
  })

  it('skips a job the store has or the filter drops before asking for its detail', async () => {
    const fake = fakeRipple()
    const context = { known: (name, id) => name === 'ltimindtree' && id === '898002', wanted: (name, raw) => raw.title !== 'Test Lead' }
    const out = await ltimindtree({ pause: noPause }).fetch(fake.http, context)
    expect(out.map((r) => r.externalId)).toEqual(['898001'])
    expect(fake.calls).toHaveLength(2)
  })

  it('throws a search status other than success rather than read an empty board', async () => {
    const fake = fakeRipple({ search: () => ({ jobVoList: [], errorStatus: 'invalid token' }) })
    await expect(ltimindtree({ pause: noPause }).fetch(fake.http)).rejects.toThrow('ltimindtree search answered "invalid token"')
  })

  it('stops at a 429 on a detail and says so', async () => {
    const adapter = hdfcbank({ pause: noPause })
    const fake = fakeRipple({ fail: (url) => (url.includes('jobSeq=898002') ? 'HTTP 429 for x' : null) })
    const out = await adapter.fetch(fake.http)
    expect(out.map((r) => r.externalId)).toEqual(['898001'])
    expect(adapter.note).toMatch(/429/)
  })

  it('passes core normalize and the default filters', async () => {
    const [r] = await ltimindtree({ pause: noPause }).fetch(fakeRipple().http)
    const p = normalize(r, 'ltimindtree')
    expect(p.degreeMin).toBe('bachelors')
    expect(p.experienceYears).toBe(5)
    expect(filter(p, RULES)).toBe(true)
  })
})
