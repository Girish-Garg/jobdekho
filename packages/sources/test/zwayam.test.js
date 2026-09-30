import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { coforge } from '@jobdekho/sources/companies/coforge.js'
import { cyient } from '@jobdekho/sources/companies/cyient.js'
import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'

// Field names and formats as public.zwayam.com/jobs/search returned them for
// careers.coforge.com and careers.cyient.com on 2026-09-30, one page trimmed
// to two postings, ids and text replaced.
const PAGE = JSON.parse(readFileSync(new URL('./fixtures/zwayam-search.json', import.meta.url), 'utf8'))
const RULES = JSON.parse(readFileSync(new URL('../../../config/filters.json', import.meta.url), 'utf8'))
const noPause = async () => {}

const withRows = (rows) => ({ ...PAGE, data: { ...PAGE.data, data: rows } })
const tenOf = (offset) =>
  withRows(Array.from({ length: 10 }, (_, i) => ({ _source: { ...PAGE.data.data[0]._source, id: 5000 + offset + i } })))

function fakeZwayam({ page = () => PAGE, fail = () => null } = {}) {
  const calls = []
  const http = async (url, opts = {}) => {
    const form = opts.body
    const cri = JSON.parse(form.get('filterCri'))
    calls.push({ url, method: opts.method, cri, domain: form.get('domain'), companyId: form.get('companyId'), headers: opts.headers })
    const failure = fail(cri)
    if (failure) throw new Error(failure)
    return { json: async () => page(cri) }
  }
  return { http, calls }
}

describe('zwayam adapters', () => {
  it("posts the app's own search with the India country facet", async () => {
    const fake = fakeZwayam()
    await coforge({ pause: noPause }).fetch(fake.http)
    const [c] = fake.calls
    expect(c.url).toBe('https://public.zwayam.com/jobs/search')
    expect(c.method).toBe('POST')
    expect(c.domain).toBe('careers.coforge.com')
    expect(c.companyId).toBe('MTUxNzM=')
    expect(c.cri.facetSelectionString).toEqual({ Country: ['India'] })
    expect(c.cri.paginationStartNo).toBe(0)
    // multipart: fetch sets the boundary only when no Content-Type is given
    expect(c.headers?.['Content-Type']).toBeUndefined()
  })

  it("names Cyient's site the same way", async () => {
    const fake = fakeZwayam()
    const out = await cyient({ pause: noPause }).fetch(fake.http)
    expect(fake.calls[0].domain).toBe('careers.cyient.com')
    expect(fake.calls[0].companyId).toBe('MTU0ODY=')
    expect(out[1].url).toBe('https://careers.cyient.com/cyient/jobview/reliability-engineer-hyderabad-india-2026092110464136')
    expect(out[1].company).toBe('Cyient')
  })

  it('maps a posting to RawPosting', async () => {
    const [r, s] = await coforge({ pause: noPause }).fetch(fakeZwayam().http)
    expect(r.externalId).toBe('1143001')
    expect(r.title).toBe('SENIOR ENGINEER')
    expect(r.company).toBe('Coforge')
    expect(r.location).toBe('Mumbai, India')
    expect(r.url).toBe('https://careers.coforge.com/coforge/jobview/senior-engineer-mumbai-2026071617413065')
    expect(r.postedAt).toBe(new Date(1790094959000).toISOString())
    expect(r.experience).toBe('2.0 to 5.0 Years')
    expect(s.location).toBe('Hyderabad, Telangāna, India')
    // no approval date: the creation date stands in
    expect(s.postedAt).toBe(new Date(1790000000000).toISOString())
    expect(r.level).toBeUndefined()
  })

  // The HTML body is cut off at 300 characters; the flat copy is whole.
  it('reads the whole body, not the cut-off HTML', async () => {
    const [r, s, old] = await coforge({ pause: noPause }).fetch(fakeZwayam().http)
    expect(PAGE.data.data[0]._source.mediumDescription).toHaveLength(300)
    expect(r.description).toContain('Qualifications: B.Tech in Computer Science. 2 to 5 years of Java.')
    expect(r.description).not.toMatch(/<p>|<strong>|&amp;/)
    expect(s.description).toContain('Role\n\nUnder direct supervision, measures and analyses')
    expect(old.description).toBe('Job Title: MuleSoft Developer\n\nSummary: Build APIs for a bank.\n\n- BE or B.Tech')
  })

  it('pages by ten until a short page, twelve pages at most', async () => {
    const fake = fakeZwayam({ page: (cri) => (cri.paginationStartNo < 30 ? tenOf(cri.paginationStartNo) : withRows([])) })
    const out = await coforge({ pause: noPause }).fetch(fake.http)
    expect(fake.calls.map((c) => c.cri.paginationStartNo)).toEqual([0, 10, 20, 30])
    expect(out).toHaveLength(30)
    const endless = fakeZwayam({ page: (cri) => tenOf(cri.paginationStartNo) })
    await coforge({ pause: noPause }).fetch(endless.http)
    expect(endless.calls).toHaveLength(12)
  })

  it('keeps a posting seen on two pages once', async () => {
    const fake = fakeZwayam({ page: (cri) => (cri.paginationStartNo === 0 ? tenOf(0) : withRows([tenOf(0).data.data[9]])) })
    expect(await cyient({ pause: noPause }).fetch(fake.http)).toHaveLength(10)
  })

  it('throws a reply without a job list rather than read an empty board', async () => {
    const fake = fakeZwayam({ page: () => ({ code: 500, data: null }) })
    await expect(coforge({ pause: noPause }).fetch(fake.http)).rejects.toThrow('coforge search answered without a job list')
  })

  it('stops at a 429 and keeps the pages read', async () => {
    const adapter = cyient({ pause: noPause })
    const fake = fakeZwayam({ page: (cri) => tenOf(cri.paginationStartNo), fail: (cri) => (cri.paginationStartNo === 20 ? 'HTTP 429 for x' : null) })
    const out = await adapter.fetch(fake.http)
    expect(out).toHaveLength(20)
    expect(fake.calls).toHaveLength(3)
    expect(adapter.note).toMatch(/429/)
  })

  it('passes core normalize and the default filters', async () => {
    const [r] = await coforge({ pause: noPause }).fetch(fakeZwayam().http)
    const p = normalize(r, 'coforge')
    expect(p.degreeMin).toBe('bachelors')
    expect(p.experienceYears).toBe(2)
    expect(filter(p, RULES)).toBe(true)
  })
})
