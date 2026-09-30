import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { workday } from '@jobdekho/sources/providers/workday.js'
import { parseSite } from '@jobdekho/sources/providers/workday-site.js'
import { indiaFacets } from '@jobdekho/sources/providers/workday-facets.js'
import { postedDaysAgo, postedAtFrom } from '@jobdekho/sources/providers/workday-posted.js'
import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'

// Trimmed from NVIDIA's live board on 2026-09-30, with the tenant, ids and
// text replaced: the facet probe, one India page, and one posting's detail.
const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))
const FACETS = fixture('workday-jobs-facets.json')
const INDIA = fixture('workday-jobs-india.json')
const DETAIL = fixture('workday-job-detail.json')

const URL_ = 'https://acme.wd5.myworkdayjobs.com/en-US/AcmeCareers'
const API = 'https://acme.wd5.myworkdayjobs.com/wday/cxs/acme/AcmeCareers'
const NOW = Date.parse('2026-09-30T12:00:00Z')
const noPause = async () => {}

// The other two rows get a detail each, built from the captured one, so
// every posting in the page has something to be described by.
const [video, intern, data] = INDIA.jobPostings
const withInfo = (patch) => ({ ...DETAIL, jobPostingInfo: { ...DETAIL.jobPostingInfo, ...patch } })
const DETAILS = {
  [video.externalPath]: DETAIL,
  [intern.externalPath]: withInfo({
    title: intern.title, location: 'India, Pune', additionalLocations: undefined,
    startDate: '2026-09-29', externalUrl: undefined, jobDescription: '<p>Pursuing a B.E.</p>',
  }),
  [data.externalPath]: withInfo({
    title: data.title, location: 'India, Hyderabad', additionalLocations: [], startDate: undefined,
  }),
}

// Routes on method and body the way the real endpoints do, and records every
// request so the tests can assert what was sent and how much.
function fakeWorkday({ facets = FACETS, page = () => INDIA, details = DETAILS, fail = () => null } = {}) {
  const calls = []
  const http = async (url, opts = {}) => {
    const body = opts.body ? JSON.parse(opts.body) : null
    calls.push({ url, method: opts.method || 'GET', body })
    const failure = fail(url, body, calls.length)
    if (failure) throw new Error(failure)
    if (opts.method === 'POST') return { json: async () => (body.limit === 1 ? facets : page(body)) }
    const path = url.slice(API.length)
    if (!details[path]) throw new Error(`HTTP 404 for ${url}`)
    return { json: async () => details[path] }
  }
  return { http, calls }
}

const run = (fake, entry = {}) =>
  workday({ url: URL_, company: 'Acme', ...entry }, { pause: noPause, now: NOW }).fetch(fake.http)

describe('workday site URL', () => {
  it('reads tenant, site and endpoints from a copied URL, locale and all', () => {
    const s = parseSite(URL_)
    expect(s.tenant).toBe('acme')
    expect(s.site).toBe('AcmeCareers')
    expect(s.listUrl).toBe(`${API}/jobs`)
    expect(s.publicBase).toBe('https://acme.wd5.myworkdayjobs.com/AcmeCareers')
  })

  it('reads the shared myworkdaysite host, where the tenant is in the path', () => {
    const s = parseSite('https://wd3.myworkdaysite.com/recruiting/acme/External')
    expect(s.listUrl).toBe('https://wd3.myworkdaysite.com/wday/cxs/acme/External/jobs')
    expect(s.publicBase).toBe('https://wd3.myworkdaysite.com/recruiting/acme/External')
  })

  it('returns null for anything else', () => {
    expect(parseSite('https://acme.com/careers')).toBeNull()
    expect(parseSite('https://acme.wd5.myworkdayjobs.com/')).toBeNull()
    expect(parseSite('not a url')).toBeNull()
    expect(parseSite(undefined)).toBeNull()
  })
})

describe('workday adapter naming', () => {
  it('names itself by tenant, or by an explicit slug', () => {
    expect(workday({ url: URL_ }).name).toBe('workday:acme')
    expect(workday({ url: URL_, slug: 'acme-campus' }).name).toBe('workday:acme-campus')
  })

  // buildAdapters runs before any fetch; a bad URL must not throw there and
  // take every other source down with it.
  it('builds from a bad URL and fails only when fetched', async () => {
    const a = workday({ url: 'https://acme.com/jobs', slug: 'acme' })
    expect(a.name).toBe('workday:acme')
    await expect(a.fetch(async () => ({}))).rejects.toThrow('careers site URL')
  })
})

describe('workday India facet', () => {
  it('finds the country facet inside a facet group', () => {
    expect(indiaFacets(FACETS.facets)).toEqual({ locationHierarchy1: ['0d0d0d0d0d0d0d0d0d0d0d0d0d0d0002'] })
  })

  it('selects every Indian city when there is no country facet, and not Indianapolis', () => {
    const cities = [{
      facetParameter: 'locations',
      values: [
        { descriptor: 'Bangalore, India', id: 'a1' },
        { descriptor: 'Indianapolis, IN, US', id: 'a2' },
        { descriptor: 'Hyderabad, India', id: 'a3' },
      ],
    }]
    expect(indiaFacets(cities)).toEqual({ locations: ['a1', 'a3'] })
  })

  // Northern Trust lists India under two facets with very different counts.
  it('picks the fullest India value when two facets carry one', () => {
    const twice = [
      { facetParameter: 'locationHierarchy1', values: [{ descriptor: 'India', id: 'thin', count: 1 }] },
      { facetParameter: 'locationCountry', values: [{ descriptor: 'India', id: 'full', count: 64 }] },
    ]
    expect(indiaFacets(twice)).toEqual({ locationCountry: ['full'] })
  })

  // Mondelez lists "Delhi, Ohio"; a city list must not pull it in.
  it('leaves same-named foreign cities out of a city selection', () => {
    const cities = [{
      facetParameter: 'locations',
      values: [
        { descriptor: 'Delhi, Ohio', id: 'b1' },
        { descriptor: 'New Delhi', id: 'b2' },
        { descriptor: 'Hyderabad, Sindh, Pakistan', id: 'b3' },
        { descriptor: 'Noida', id: 'b4' },
      ],
    }]
    expect(indiaFacets(cities)).toEqual({ locations: ['b2', 'b4'] })
  })

  // FIS names offices by code; uppercase IND is India, "Indiana" is not.
  it('reads an Indian office code as India', () => {
    const codes = [{
      facetParameter: 'locations',
      values: [
        { descriptor: 'IND BNGL FL2-3 TWR 3', id: 'c1' },
        { descriptor: 'Indiana, US', id: 'c2' },
        { descriptor: 'IND HRYN 402', id: 'c3' },
      ],
    }]
    expect(indiaFacets(codes)).toEqual({ locations: ['c1', 'c3'] })
  })

  it('returns null when nothing names India', () => {
    expect(indiaFacets([{ facetParameter: 'jobFamilyGroup', values: [{ descriptor: 'India Ops', id: 'x' }] }])).toBeNull()
    expect(indiaFacets(undefined)).toBeNull()
  })
})

describe('workday listing', () => {
  it('asks for India by facet, not by free text', async () => {
    const fake = fakeWorkday()
    await run(fake)
    const [probe, first] = fake.calls
    expect(probe.body).toEqual({ appliedFacets: {}, limit: 1, offset: 0, searchText: '' })
    expect(first.method).toBe('POST')
    expect(first.body.appliedFacets).toEqual({ locationHierarchy1: ['0d0d0d0d0d0d0d0d0d0d0d0d0d0d0002'] })
    expect(first.body.searchText).toBe('')
    expect(first.body.limit).toBe(20)
  })

  it('falls back to searching for India when the site has no location facet', async () => {
    const fake = fakeWorkday({ facets: { total: 5, jobPostings: [], facets: [] } })
    await run(fake)
    expect(fake.calls[1].body).toMatchObject({ appliedFacets: {}, searchText: 'India' })
  })

  // Workday reports total on the first page only and 0 on later ones, so the
  // first page's figure is the one that decides how far to read.
  it('pages by the first page total', async () => {
    const rows = (offset) => Array.from({ length: 20 }, (_, i) => ({ ...video, externalPath: `/job/x/Role_${offset + i}` }))
    const fake = fakeWorkday({
      page: (b) => ({ total: b.offset === 0 ? 45 : 0, jobPostings: rows(b.offset).slice(0, b.offset === 40 ? 5 : 20) }),
      details: new Proxy({}, { get: () => DETAIL }),
    })
    const out = await run(fake)
    const offsets = fake.calls.filter((c) => c.body?.limit === 20).map((c) => c.body.offset)
    expect(offsets).toEqual([0, 20, 40])
    expect(out).toHaveLength(40)
  })

  // Listing reaches back 100; a run describes at most 40 of them, and the
  // rest wait for the next run rather than going out without a body.
  it('lists 100 postings and describes at most 40 however many the site has', async () => {
    const fake = fakeWorkday({
      page: (b) => ({ total: 248, jobPostings: Array.from({ length: 20 }, (_, i) => ({ ...video, externalPath: `/job/x/R_${b.offset + i}` })) }),
      details: new Proxy({}, { get: () => DETAIL }),
    })
    const out = await run(fake)
    expect(fake.calls.filter((c) => c.body?.limit === 20)).toHaveLength(5)
    expect(fake.calls.filter((c) => c.method === 'GET')).toHaveLength(40)
    expect(out).toHaveLength(40)
    expect(out[0].externalId).toBe('R_0')
  })

  it('pauses before every request after the facet probe', async () => {
    let pauses = 0
    const fake = fakeWorkday()
    await workday({ url: URL_ }, { pause: async () => { pauses++ }, now: NOW }).fetch(fake.http)
    expect(pauses).toBe(fake.calls.length - 1)
  })

  // Two lanes per careers site: fast enough for a hundred boards, and never
  // a burst against one company's site.
  it('keeps at most two detail calls in flight', async () => {
    let inFlight = 0
    let peak = 0
    const base = fakeWorkday({
      page: (b) => ({ total: 20, jobPostings: Array.from({ length: 20 }, (_, i) => ({ ...video, externalPath: '/job/x/R_' + i })) }),
      details: new Proxy({}, { get: () => DETAIL }),
    })
    const http = async (url, opts) => {
      if (opts?.method === 'POST') return base.http(url, opts)
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 1))
      inFlight--
      return base.http(url, opts)
    }
    const out = await workday({ url: URL_ }, { pause: noPause, now: NOW }).fetch(http)
    expect(out).toHaveLength(20)
    expect(peak).toBe(2)
  })

  it('returns an empty list for an empty board', async () => {
    const fake = fakeWorkday({ facets: {}, page: () => ({}) })
    expect(await run(fake)).toEqual([])
  })
})

describe('workday postings', () => {
  it('maps a listed posting and its detail to RawPosting', async () => {
    const [r] = await run(fakeWorkday())
    expect(r.externalId).toBe('Senior-System-Software-Engineer_JR0000201')
    expect(r.title).toBe('Senior System Software Engineer - Video')
    expect(r.company).toBe('Acme')
    expect(r.url).toBe(DETAIL.jobPostingInfo.externalUrl)
    expect(r.tags).toEqual(['Full time'])
  })

  it('names every location where the list said only "3 Locations"', async () => {
    const [r] = await run(fakeWorkday())
    expect(r.location).toBe('India, Bengaluru / India, Hyderabad / India, Pune')
  })

  it('adds the country to a place that does not name it', async () => {
    const coded = { [video.externalPath]: withInfo({ location: 'IND BNGL FL2-3 TWR 3', additionalLocations: [] }) }
    const fake = fakeWorkday({ page: () => ({ total: 1, jobPostings: [video] }), details: coded })
    const [r] = await run(fake)
    expect(r.location).toBe('IND BNGL FL2-3 TWR 3, India')
  })

  it('carries the body as plain text, degree requirement included', async () => {
    const [r] = await run(fakeWorkday())
    expect(r.description).toContain("Acme's video team builds the streaming stack.")
    expect(r.description).toContain('B.Tech in Computer Science')
    expect(r.description).not.toMatch(/<[a-z/]|&#39;/)
  })

  it('dates a posting by its startDate', async () => {
    const [r, i] = await run(fakeWorkday())
    expect(r.postedAt).toBe('2026-09-30T00:00:00.000Z')
    expect(i.postedAt).toBe('2026-09-29T00:00:00.000Z')
  })

  it('falls back to postedOn when the detail has no startDate, 30+ read as 30', async () => {
    const [, , d] = await run(fakeWorkday())
    expect(d.postedAt).toBe('2026-08-31T00:00:00.000Z')
  })

  it('builds the public URL when the detail gives none', async () => {
    const [, i] = await run(fakeWorkday())
    expect(i.url).toBe(`https://acme.wd5.myworkdayjobs.com/AcmeCareers${intern.externalPath}`)
  })

  // No worker type reaches a posting, so the title classifier decides, and
  // type is derived in core from level.
  it('sets neither level nor type', async () => {
    const out = await run(fakeWorkday())
    for (const r of out) {
      expect(r.level).toBeUndefined()
      expect(r.type).toBeUndefined()
    }
  })

  it('falls back to a capitalised tenant when config names no company', async () => {
    const [r] = await workday({ url: URL_ }, { pause: noPause, now: NOW }).fetch(fakeWorkday().http)
    expect(r.company).toBe('Acme')
  })
})

describe('workday failures', () => {
  it('leaves out only the posting whose detail failed', async () => {
    const fake = fakeWorkday({ fail: (url) => (url.endsWith(intern.externalPath) ? 'timeout' : null) })
    const out = await run(fake)
    expect(out.map((r) => r.title)).toEqual([video.title, data.title])
  })

  it('sends nothing more once the host answers 429, and keeps what it read', async () => {
    const fake = fakeWorkday({ fail: (url) => (url.endsWith(intern.externalPath) ? `HTTP 429 for ${url}` : null) })
    const out = await run(fake)
    expect(out.map((r) => r.title)).toEqual([video.title])
    expect(fake.calls.at(-1).url).toContain(intern.externalPath)
  })

  it('reports a source whose every detail call fails', async () => {
    const fake = fakeWorkday({ details: {} })
    await expect(run(fake)).rejects.toThrow('no detail could be read')
  })

  it('throws when the first page fails, so the run records why', async () => {
    const fake = fakeWorkday({ fail: (url, body) => (body?.limit === 20 ? 'HTTP 500' : null) })
    await expect(run(fake)).rejects.toThrow('HTTP 500')
  })

  it('skips a failed later page and reads the rest', async () => {
    const fake = fakeWorkday({
      page: (b) => ({ total: 60, jobPostings: Array.from({ length: 20 }, (_, i) => ({ ...video, externalPath: `/job/x/R_${b.offset + i}` })) }),
      details: new Proxy({}, { get: () => DETAIL }),
      fail: (url, body) => (body?.offset === 20 ? 'HTTP 502' : null),
    })
    const out = await run(fake)
    expect(out).toHaveLength(40)
  })
})

describe('workday postedOn', () => {
  it('reads the prose Workday uses', () => {
    expect(postedDaysAgo('Posted Today')).toBe(0)
    expect(postedDaysAgo('Posted Yesterday')).toBe(1)
    expect(postedDaysAgo('Posted 3 Days Ago')).toBe(3)
    expect(postedDaysAgo('Posted 30+ Days Ago')).toBe(30)
    expect(postedDaysAgo('')).toBeNull()
    expect(postedDaysAgo(undefined)).toBeNull()
  })

  it('counts back from midnight UTC so it agrees with a startDate', () => {
    expect(postedAtFrom('Posted 3 Days Ago', NOW)).toBe('2026-09-27T00:00:00.000Z')
    expect(postedAtFrom('soon', NOW)).toBeNull()
  })
})

// The runner's context (apps/scraper/src/scrape.js): known says the store
// already holds a posting's body, wanted runs the relevance filter.
describe('workday with the run context', () => {
  const runWith = (fake, context) =>
    workday({ url: URL_, company: 'Acme' }, { pause: noPause, now: NOW }).fetch(fake.http, context)
  const gets = (fake) => fake.calls.filter((c) => c.method === 'GET').map((c) => c.url.slice(API.length))

  it('asks for no detail of a posting the store already describes, and leaves it out', async () => {
    const fake = fakeWorkday()
    const seen = []
    const known = (source, id) => { seen.push([source, id]); return id === 'Software-Engineering-Intern_JR0000202' }
    const out = await runWith(fake, { known })
    expect(seen[0]).toEqual(['workday:acme', 'Senior-System-Software-Engineer_JR0000201'])
    expect(gets(fake)).toEqual([video.externalPath, data.externalPath])
    expect(out.map((r) => r.title)).toEqual([video.title, data.title])
  })

  it('asks for no detail of a posting the filter would drop', async () => {
    const fake = fakeWorkday()
    const wanted = (source, raw) => raw.title !== data.title
    const out = await runWith(fake, { wanted })
    expect(gets(fake)).toEqual([video.externalPath, intern.externalPath])
    expect(out).toHaveLength(2)
  })

  // "3 Locations" or an office code would fail core's location rule on text
  // alone, though the India facet already vouches for every row.
  it('shows the filter the listed row, with no location when the facet scoped it', async () => {
    const raws = []
    await runWith(fakeWorkday(), { wanted: (source, raw) => { raws.push(raw); return true } })
    expect(raws[0]).toEqual({ externalId: 'Senior-System-Software-Engineer_JR0000201', title: video.title, company: 'Acme', location: '' })
  })

  it('keeps the listed location for the filter when only text search found the row', async () => {
    const raws = []
    const fake = fakeWorkday({ facets: { facets: [] } })
    await runWith(fake, { wanted: (source, raw) => { raws.push(raw); return true } })
    expect(raws.map((r) => r.location)).toEqual(['', 'India, Pune', 'India, Hyderabad'])
  })

  it('reports nothing wrong when every listed posting is already known', async () => {
    const fake = fakeWorkday()
    expect(await runWith(fake, { known: () => true })).toEqual([])
    expect(gets(fake)).toEqual([])
  })

  it('notes a run cut short by a 429 without failing it', async () => {
    const fake = fakeWorkday({ fail: (url) => (url.endsWith(intern.externalPath) ? `HTTP 429 for ${url}` : null) })
    const adapter = workday({ url: URL_ }, { pause: noPause, now: NOW })
    await adapter.fetch(fake.http)
    expect(adapter.note).toContain('429')
  })
})

// The same wanted() scrape.js builds, over the real relevance floor: a blank
// location has to read as "no objection", or every multi-city role on a
// facet-scoped board would be skipped before its detail was ever read.
describe('workday listed rows against config/filters.json', () => {
  const rules = JSON.parse(readFileSync(new URL('../../../config/filters.json', import.meta.url), 'utf8'))
  const wanted = (source, raw) => filter(normalize(raw, source), rules)

  it('keeps a multi-city engineering role and drops a sales one', async () => {
    const sales = { ...intern, title: 'Regional Sales Manager', externalPath: '/job/India-Pune/Regional-Sales-Manager_JR0000299' }
    const fake = fakeWorkday({ page: () => ({ total: 2, jobPostings: [video, sales] }) })
    const out = await workday({ url: URL_, company: 'Acme' }, { pause: noPause, now: NOW }).fetch(fake.http, { wanted })
    expect(out.map((r) => r.title)).toEqual([video.title])
  })
})

// A quiet tenant used to cost a facet probe and five pages every run. With
// what the last full read left in the run's memo, it costs one request.
describe('workday incremental listing', () => {
  const FACET = { locationHierarchy1: ['0d0d0d0d0d0d0d0d0d0d0d0d0d0d0002'] }
  const dayAgo = new Date(Date.now() - 86400000).toISOString()
  function memoContext({ kept = null, known = () => false } = {}) {
    const calls = { unchanged: [], keep: [] }
    return {
      calls,
      context: {
        known: (name, id) => known(id),
        wanted: () => true,
        recall: (name, key) => (key === 'workday' ? kept : null),
        keep: (name, key, value) => calls.keep.push([name, key, value]),
        unchanged: (name, since) => calls.unchanged.push([name, since]),
      },
    }
  }
  const go = (fake, context) => workday({ url: URL_, company: 'Acme' }, { pause: noPause, now: NOW }).fetch(fake.http, context)

  it('skips the facet probe while the remembered facets are fresh', async () => {
    const fake = fakeWorkday()
    await go(fake, memoContext({ kept: { facets: FACET, facetsAt: dayAgo, total: 99, fullAt: dayAgo } }).context)
    expect(fake.calls[0].body).toMatchObject({ appliedFacets: FACET, limit: 20, offset: 0 })
    expect(fake.calls.some((c) => c.body?.limit === 1)).toBe(false)
  })

  it('stops after a first page of known postings when the count has not moved, and counts them all as seen', async () => {
    const fake = fakeWorkday()
    const { context, calls } = memoContext({ kept: { facets: FACET, facetsAt: dayAgo, total: INDIA.total, fullAt: dayAgo }, known: () => true })
    const out = await go(fake, context)
    expect(out).toEqual([])
    expect(fake.calls).toHaveLength(1)
    expect(calls.unchanged).toEqual([['workday:acme', dayAgo]])
  })

  it('reads on as before when the count moved, and remembers the new full read', async () => {
    const fake = fakeWorkday()
    const { context, calls } = memoContext({ kept: { facets: FACET, facetsAt: dayAgo, total: INDIA.total + 1, fullAt: dayAgo }, known: () => true })
    await go(fake, context)
    expect(calls.unchanged).toEqual([])
    const [[, key, value]] = calls.keep
    expect(key).toBe('workday')
    expect(value).toMatchObject({ facets: FACET, facetsAt: dayAgo, total: INDIA.total })
  })

  it('probes again when the remembered facets fail', async () => {
    const fake = fakeWorkday({ fail: (url, body, n) => (n === 1 ? 'HTTP 422 for ' + url : null) })
    const { context, calls } = memoContext({ kept: { facets: { gone: ['x'] }, facetsAt: dayAgo, total: 3, fullAt: dayAgo } })
    await go(fake, context)
    expect(fake.calls[1].body).toEqual({ appliedFacets: {}, limit: 1, offset: 0, searchText: '' })
    expect(calls.keep[0][2].facetsAt).not.toBe(dayAgo)
  })

  it('reads the facets afresh once they are a week old', async () => {
    const old = new Date(Date.now() - 8 * 86400000).toISOString()
    const fake = fakeWorkday()
    await go(fake, memoContext({ kept: { facets: FACET, facetsAt: old, total: 3, fullAt: old } }).context)
    expect(fake.calls[0].body.limit).toBe(1)
  })

  it('names the data centre it lives on', () => {
    expect(workday({ url: URL_ }).hostKey).toBe('workday:wd5')
  })
})
