import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { oracle } from '@jobdekho/sources/providers/oracle.js'
import { readSitePage } from '@jobdekho/sources/providers/oracle-site.js'
import { indiaFromFacets, indiaFromSuggestions } from '@jobdekho/sources/providers/oracle-facets.js'
import { listUrl, detailUrl } from '@jobdekho/sources/providers/oracle-api.js'
import { placesOf } from '@jobdekho/sources/providers/oracle-posting.js'
import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'

// Trimmed from Texas Instruments' and Honeywell's live boards on 2026-09-30,
// with hosts, ids and text replaced: the careers page, the facet probe, one
// India page, one posting's detail, and the location search box's answer.
const fixturePath = (name) => new URL(`./fixtures/${name}`, import.meta.url)
const fixture = (name) => JSON.parse(readFileSync(fixturePath(name), 'utf8'))
const SITE_HTML = readFileSync(fixturePath('oracle-site.html'), 'utf8')
const FACETS = fixture('oracle-jobs-facets.json')
const INDIA = fixture('oracle-jobs-india.json')
const DETAIL = fixture('oracle-job-detail.json')
const SUGGESTIONS = fixture('oracle-location-suggestions.json')

const PAGE_URL = 'https://careers.acme.example/en/sites/AcmeCareers'
const API = 'https://abcd.fa.us2.oraclecloud.com/hcmRestApi/resources/latest'
const INDIA_ID = '300000000000484'
const noPause = async () => {}

const [embedded, intern, data] = INDIA.items[0].requisitionList
const withInfo = (patch) => ({ ...DETAIL, items: [{ ...DETAIL.items[0], ...patch }] })
const DETAILS = {
  [embedded.Id]: DETAIL,
  [intern.Id]: withInfo({
    Id: intern.Id, Title: intern.Title, PrimaryLocation: intern.PrimaryLocation, secondaryLocations: [],
    ExternalPostedStartDate: '2026-09-29T08:00:00+00:00', WorkplaceTypeCode: null, JobSchedule: null,
    ExternalDescriptionStr: '<p>Pursuing a B.E. in Computer Science</p>', ExternalResponsibilitiesStr: '', ExternalQualificationsStr: '',
  }),
  [data.Id]: withInfo({
    Id: data.Id, Title: data.Title, PrimaryLocation: data.PrimaryLocation, secondaryLocations: data.secondaryLocations,
    ExternalPostedStartDate: null, WorkplaceTypeCode: 'ORA_REMOTE',
  }),
}

// The finder's parameters, as the server reads them out of the URL.
function finderOf(url) {
  const raw = decodeURIComponent(new URL(url).searchParams.get('finder') || '')
  const [, rest = ''] = raw.split(';')
  return Object.fromEntries(rest.split(',').map((p) => p.split('=')))
}

// Routes on URL the way the real hosts do, and records every request so the
// tests can assert what was sent and how much.
function fakeOracle({ html = SITE_HTML, facets = FACETS, page = () => INDIA, details = DETAILS, suggest = SUGGESTIONS, fail = () => null } = {}) {
  const calls = []
  const http = async (url, opts = {}) => {
    const kind = url.startsWith(PAGE_URL) ? 'page'
      : url.includes('/recruitingCEJobRequisitions?') ? 'list'
        : url.includes('/recruitingCEJobRequisitionDetails?') ? 'detail'
          : url.includes('/recruitingCESearchAutoSuggestions?') ? 'suggest' : 'other'
    const finder = kind === 'page' || kind === 'other' ? {} : finderOf(url)
    calls.push({ url, kind, finder, opts })
    const failure = fail(url, kind, finder)
    if (failure) throw new Error(failure)
    if (kind === 'page') return { text: async () => html }
    if (kind === 'list') return { json: async () => (finder.limit === '1' ? facets : page(finder)) }
    if (kind === 'suggest') return { json: async () => suggest }
    const id = finder.Id?.replace(/"/g, '')
    if (kind !== 'detail' || !details[id]) throw new Error(`HTTP 404 for ${url}`)
    return { json: async () => details[id] }
  }
  return { http, calls }
}

const run = (fake, entry = {}, context) =>
  oracle({ url: PAGE_URL, company: 'Acme', ...entry }, { pause: noPause }).fetch(fake.http, context)

const rowsFrom = (offset, n) => Array.from({ length: n }, (_, i) => ({ ...embedded, Id: String(26000000 + offset + i) }))
const anyDetail = new Proxy({}, { get: () => DETAIL })

describe('oracle careers page', () => {
  it('reads the API host, site number and public root off a company domain', () => {
    expect(readSitePage(SITE_HTML, PAGE_URL)).toEqual({
      api: 'https://abcd.fa.us2.oraclecloud.com',
      siteNumber: 'CX_1',
      publicBase: 'https://careers.acme.example/en/sites/AcmeCareers',
    })
  })

  // Oceaneering's link names no site; the page it lands on says /sites/jobs.
  it('takes the public root from the base tag, not from the URL configured', () => {
    const html = '<base href="/hcmUI/CandidateExperience/en/sites/jobs" data-cspnonce ="x" data-apibaseurl="https://ebfr.fa.us2.oraclecloud.com:443" data-sitenumber="CX_3001"/>'
    expect(readSitePage(html, 'https://ebfr.fa.us2.oraclecloud.com/hcmUI/CandidateExperience')).toEqual({
      api: 'https://ebfr.fa.us2.oraclecloud.com',
      siteNumber: 'CX_3001',
      publicBase: 'https://ebfr.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/jobs',
    })
  })

  it('follows a page only to an Oracle API host with a plain site number', () => {
    const page = (api, site) => `<base href="/x" data-apibaseurl="${api}" data-sitenumber="${site}"/>`
    expect(readSitePage(page('https://evil.example', 'CX_1'), PAGE_URL)).toBeNull()
    expect(readSitePage(page('http://abcd.fa.us2.oraclecloud.com', 'CX_1'), PAGE_URL)).toBeNull()
    expect(readSitePage(page('https://oraclecloud.com.evil.example', 'CX_1'), PAGE_URL)).toBeNull()
    expect(readSitePage(page('https://abcd.fa.us2.oraclecloud.com', 'CX_1,limit=500'), PAGE_URL)).toBeNull()
    expect(readSitePage('<div data-apibaseurl="https://abcd.fa.us2.oraclecloud.com" data-sitenumber="CX_1"></div>', PAGE_URL)).toBeNull()
    expect(readSitePage('<html>Just a careers page</html>', PAGE_URL)).toBeNull()
    expect(readSitePage(undefined, PAGE_URL)).toBeNull()
  })

  it('reads the page as HTML, then calls the API host the page named', async () => {
    const fake = fakeOracle()
    await run(fake)
    expect(fake.calls[0]).toMatchObject({ url: PAGE_URL, kind: 'page' })
    expect(fake.calls[0].opts.headers.Accept).toBe('text/html')
    expect(fake.calls.slice(1).every((c) => c.url.startsWith(API))).toBe(true)
  })

  it('fails the source when the page is not an Oracle careers site', async () => {
    const fake = fakeOracle({ html: '<html>moved</html>' })
    await expect(run(fake)).rejects.toThrow('no Oracle API host and site number')
  })
})

describe('oracle adapter naming', () => {
  it('names itself by company, or by an explicit slug', () => {
    expect(oracle({ url: PAGE_URL, company: 'Texas Instruments' }).name).toBe('oracle:texas-instruments')
    expect(oracle({ url: PAGE_URL, company: 'Texas Instruments', slug: 'ti' }).name).toBe('oracle:ti')
    expect(oracle({ url: PAGE_URL }).name).toBe('oracle:unknown')
  })

  // buildAdapters runs before any fetch; a bad URL must not throw there and
  // take every other source down with it.
  it('builds from a bad URL and fails only when fetched', async () => {
    const a = oracle({ url: 'not a url', company: 'Acme' })
    expect(a.name).toBe('oracle:acme')
    await expect(a.fetch(async () => ({}))).rejects.toThrow('careers site URL')
    await expect(oracle({ url: 'ftp://acme.example/jobs' }).fetch(async () => ({}))).rejects.toThrow('careers site URL')
  })
})

describe('oracle India location', () => {
  it('finds India among the location facet values', () => {
    expect(indiaFromFacets(FACETS.items[0].locationsFacet)).toBe(INDIA_ID)
    expect(indiaFromFacets([{ Id: 1, Name: 'Karnataka, India' }])).toBeNull()
    expect(indiaFromFacets(undefined)).toBeNull()
  })

  it('takes the country from the location search, not Indiahoma or a town in India', () => {
    expect(indiaFromSuggestions(SUGGESTIONS.items)).toBe(INDIA_ID)
    expect(indiaFromSuggestions(SUGGESTIONS.items.slice(1))).toBeNull()
    const town = { Id: '1', Name: 'India', Level: 3, City: 'India', State: 'X', Country: 'Elsewhere' }
    expect(indiaFromSuggestions([town, ...SUGGESTIONS.items])).toBe(INDIA_ID)
    expect(indiaFromSuggestions(undefined)).toBeNull()
  })

  it('asks the location search only when the facet does not name India', async () => {
    const withIndia = fakeOracle()
    await run(withIndia)
    expect(withIndia.calls.some((c) => c.kind === 'suggest')).toBe(false)

    const facets = { items: [{ ...FACETS.items[0], locationsFacet: FACETS.items[0].locationsFacet.filter((f) => f.Name !== 'India') }] }
    const without = fakeOracle({ facets })
    const out = await run(without)
    expect(without.calls.map((c) => c.kind).slice(0, 4)).toEqual(['page', 'list', 'suggest', 'list'])
    expect(without.calls[3].finder.selectedLocationsFacet).toBe(INDIA_ID)
    expect(out).toHaveLength(3)
  })

  it('lists nothing, and says so, when the site knows no India', async () => {
    const fake = fakeOracle({ facets: { items: [{ locationsFacet: [] }] }, suggest: { items: [] } })
    const adapter = oracle({ url: PAGE_URL, company: 'Acme' }, { pause: noPause })
    expect(await adapter.fetch(fake.http)).toEqual([])
    expect(fake.calls.map((c) => c.kind)).toEqual(['page', 'list', 'suggest'])
    expect(adapter.note).toContain('no India')
  })
})

describe('oracle listing', () => {
  it('builds the finder the careers site sends', () => {
    const site = { api: 'https://abcd.fa.us2.oraclecloud.com', siteNumber: 'CX_1' }
    expect(listUrl(site, { limit: 25, offset: 50, india: INDIA_ID })).toBe(
      `${API}/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations`
      + `&finder=findReqs;siteNumber=CX_1,facetsList=LOCATIONS,limit=25,offset=50,lastSelectedFacet=LOCATIONS,selectedLocationsFacet=${INDIA_ID},sortBy=POSTING_DATES_DESC`,
    )
    expect(detailUrl(site, '25000101')).toBe(
      `${API}/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id=%2225000101%22,siteNumber=CX_1`,
    )
  })

  it('probes the facet unfiltered, then asks for India by facet, newest first', async () => {
    const fake = fakeOracle()
    await run(fake)
    const [, probe, first] = fake.calls
    expect(probe.finder).toMatchObject({ siteNumber: 'CX_1', facetsList: 'LOCATIONS', limit: '1', offset: '0' })
    expect(probe.finder.selectedLocationsFacet).toBeUndefined()
    expect(first.finder).toMatchObject({ limit: '25', offset: '0', selectedLocationsFacet: INDIA_ID, sortBy: 'POSTING_DATES_DESC' })
    expect(first.finder.keyword).toBeUndefined()
  })

  it('pages by the total every page reports', async () => {
    const fake = fakeOracle({
      page: (f) => ({ items: [{ TotalJobsCount: 55, requisitionList: rowsFrom(Number(f.offset), f.offset === '50' ? 5 : 25) }] }),
      details: anyDetail,
    })
    const out = await run(fake)
    const offsets = fake.calls.filter((c) => c.kind === 'list' && c.finder.limit === '25').map((c) => c.finder.offset)
    expect(offsets).toEqual(['0', '25', '50'])
    expect(out).toHaveLength(40)
  })

  // Listing reaches back 100; a run describes at most 40 of them, and the
  // rest wait for the next run rather than going out without a body.
  it('lists 100 postings and describes at most 40 however many the site has', async () => {
    const fake = fakeOracle({
      page: (f) => ({ items: [{ TotalJobsCount: 2254, requisitionList: rowsFrom(Number(f.offset), 25) }] }),
      details: anyDetail,
    })
    const out = await run(fake)
    expect(fake.calls.filter((c) => c.kind === 'list' && c.finder.limit === '25')).toHaveLength(4)
    expect(fake.calls.filter((c) => c.kind === 'detail')).toHaveLength(40)
    expect(out).toHaveLength(40)
    expect(out[0].externalId).toBe('26000000')
  })

  it('describes a row once when a shifting page lists it twice', async () => {
    const fake = fakeOracle({ page: () => ({ items: [{ TotalJobsCount: 4, requisitionList: [embedded, intern, embedded, data] }] }) })
    const out = await run(fake)
    expect(fake.calls.filter((c) => c.kind === 'detail')).toHaveLength(3)
    expect(out.map((r) => r.externalId)).toEqual([embedded.Id, intern.Id, data.Id])
  })

  it('pauses before every request after the careers page', async () => {
    let pauses = 0
    const fake = fakeOracle()
    await oracle({ url: PAGE_URL }, { pause: async () => { pauses++ } }).fetch(fake.http)
    expect(pauses).toBe(fake.calls.length - 1)
    const facets = { items: [{ locationsFacet: [] }] }
    const viaSearch = fakeOracle({ facets })
    pauses = 0
    await oracle({ url: PAGE_URL }, { pause: async () => { pauses++ } }).fetch(viaSearch.http)
    expect(viaSearch.calls.some((c) => c.kind === 'suggest')).toBe(true)
    expect(pauses).toBe(viaSearch.calls.length - 1)
  })

  // Two lanes per board: fast enough for a dozen boards, and never a burst
  // against one company's site.
  it('keeps at most two detail calls in flight', async () => {
    let inFlight = 0
    let peak = 0
    const base = fakeOracle({ page: () => ({ items: [{ TotalJobsCount: 20, requisitionList: rowsFrom(0, 20) }] }), details: anyDetail })
    const http = async (url, opts) => {
      if (!url.includes('Details?')) return base.http(url, opts)
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 1))
      inFlight--
      return base.http(url, opts)
    }
    const out = await oracle({ url: PAGE_URL }, { pause: noPause }).fetch(http)
    expect(out).toHaveLength(20)
    expect(peak).toBe(2)
  })

  it('returns an empty list for an empty board', async () => {
    const fake = fakeOracle({ page: () => ({ items: [{ TotalJobsCount: 0, requisitionList: [] }] }) })
    expect(await run(fake)).toEqual([])
    const odd = fakeOracle({ page: () => ({}) })
    expect(await run(odd)).toEqual([])
  })
})

describe('oracle postings', () => {
  it('maps a listed row and its detail to RawPosting', async () => {
    const [r] = await run(fakeOracle())
    expect(r.externalId).toBe('25000101')
    expect(r.title).toBe('Senior Embedded Software Engineer')
    expect(r.company).toBe('Acme')
    expect(r.url).toBe('https://careers.acme.example/en/sites/AcmeCareers/job/25000101')
    expect(r.tags).toEqual(['Hybrid', 'Full time'])
  })

  it('names every place, dropping one that only repeats the country', async () => {
    const [e, i, d] = await run(fakeOracle())
    expect(e.location).toBe('Bengaluru, Karnataka, India')
    expect(i.location).toBe('Pune, Maharashtra, India')
    expect(d.location).toBe('Singapore / Hyderabad, Telangana, India')
    expect(placesOf({ PrimaryLocation: 'India', secondaryLocations: [{ Name: 'Pune, Maharashtra, India' }, { Name: 'Singapore' }] }))
      .toBe('Pune, Maharashtra, India / Singapore')
    expect(placesOf({})).toBe('')
  })

  it('carries the posting body as plain text, qualifications included', async () => {
    const [r] = await run(fakeOracle())
    expect(r.description).toContain('builds the firmware in every Acme controller')
    expect(r.description).toContain('Own the RTOS drivers')
    expect(r.description).toContain('B.Tech in Computer Science or Electronics')
    expect(r.description).not.toMatch(/<[a-z/]|&nbsp;|&#39;/)
  })

  it('leaves out the corporate and legal blocks every posting repeats', async () => {
    const [r] = await run(fakeOracle())
    expect(r.description).not.toContain('Why Acme?')
    expect(r.description).not.toContain('citizenship')
    expect(r.description).not.toContain('Internal only')
  })

  it('dates a posting by when it went up, or by the listed day', async () => {
    const [e, i, d] = await run(fakeOracle())
    expect(e.postedAt).toBe('2026-09-30T13:09:42.000Z')
    expect(i.postedAt).toBe('2026-09-29T08:00:00.000Z')
    expect(d.postedAt).toBe('2026-08-31T00:00:00.000Z')
  })

  it('reads the workplace from Oracle\'s code, not the company\'s label', async () => {
    const [, i, d] = await run(fakeOracle())
    expect(i.tags).toEqual([])
    expect(d.tags).toEqual(['Remote', 'Full time'])
  })

  // No worker type reaches a posting, so the title classifier decides, and
  // type is derived in core from level.
  it('sets neither level nor type', async () => {
    for (const r of await run(fakeOracle())) {
      expect(r.level).toBeUndefined()
      expect(r.type).toBeUndefined()
    }
  })

  it('falls back to the listed row when the detail omits a field', async () => {
    const bare = { [embedded.Id]: { items: [{ Id: embedded.Id }] } }
    const fake = fakeOracle({ page: () => ({ items: [{ TotalJobsCount: 1, requisitionList: [embedded] }] }), details: bare })
    const [r] = await run(fake)
    expect(r.title).toBe(embedded.Title)
    expect(r.location).toBe('Bengaluru, Karnataka, India')
    expect(r.postedAt).toBe('2026-09-30T00:00:00.000Z')
    expect(r.tags).toEqual(['Hybrid'])
    expect(r.description).toBe('')
  })
})

describe('oracle failures', () => {
  it('leaves out only the posting whose detail failed', async () => {
    const fake = fakeOracle({ fail: (url, kind, f) => (f.Id === `"${intern.Id}"` ? 'timeout' : null) })
    const out = await run(fake)
    expect(out.map((r) => r.title)).toEqual([embedded.Title, data.Title])
  })

  it('sends nothing more once the host answers 429, keeps what it read, and notes it', async () => {
    const fake = fakeOracle({ fail: (url, kind, f) => (f.Id === `"${intern.Id}"` ? `HTTP 429 for ${url}` : null) })
    const adapter = oracle({ url: PAGE_URL, company: 'Acme' }, { pause: noPause })
    const out = await adapter.fetch(fake.http)
    expect(out.map((r) => r.title)).toEqual([embedded.Title])
    expect(fake.calls.at(-1).finder.Id).toBe(`"${intern.Id}"`)
    expect(adapter.note).toContain('429')
  })

  it('stops paging at a 429 and describes what it listed', async () => {
    const fake = fakeOracle({
      page: (f) => ({ items: [{ TotalJobsCount: 75, requisitionList: rowsFrom(Number(f.offset), 25) }] }),
      details: anyDetail,
      fail: (url, kind, f) => (kind === 'list' && f.offset === '25' ? `HTTP 429 for ${url}` : null),
    })
    const adapter = oracle({ url: PAGE_URL }, { pause: noPause })
    const out = await adapter.fetch(fake.http)
    expect(fake.calls.filter((c) => c.kind === 'list').map((c) => c.finder.offset)).toEqual(['0', '0', '25'])
    expect(out).toHaveLength(25)
    expect(adapter.note).toContain('429')
  })

  // The runner retries a source that threw; a refused host must not see it.
  it('fails on a 429 before anything is listed, and its retry sends nothing', async () => {
    const fake = fakeOracle({ fail: (url, kind) => (kind === 'list' ? `HTTP 429 for ${url}` : null) })
    const adapter = oracle({ url: PAGE_URL }, { pause: noPause })
    await expect(adapter.fetch(fake.http)).rejects.toThrow('429')
    const sent = fake.calls.length
    await expect(adapter.fetch(fake.http)).rejects.toThrow('429')
    expect(fake.calls).toHaveLength(sent)
    expect(adapter.note).toContain('429')
  })

  it('reports a source whose every detail call fails', async () => {
    await expect(run(fakeOracle({ details: {} }))).rejects.toThrow('no detail could be read')
  })

  it('throws when the first page fails, so the run records why', async () => {
    const fake = fakeOracle({ fail: (url, kind, f) => (kind === 'list' && f.limit === '25' ? 'HTTP 500' : null) })
    await expect(run(fake)).rejects.toThrow('HTTP 500')
  })

  it('skips a failed later page and reads the rest', async () => {
    const fake = fakeOracle({
      page: (f) => ({ items: [{ TotalJobsCount: 75, requisitionList: rowsFrom(Number(f.offset), 25) }] }),
      details: anyDetail,
      fail: (url, kind, f) => (kind === 'list' && f.offset === '25' ? 'HTTP 502' : null),
    })
    expect(await run(fake)).toHaveLength(40)
  })
})

// The runner's context (apps/scraper/src/scrape.js): known says the store
// already holds a posting's body, wanted runs the relevance filter.
describe('oracle with the run context', () => {
  const details = (fake) => fake.calls.filter((c) => c.kind === 'detail').map((c) => c.finder.Id.replace(/"/g, ''))

  it('asks for no detail of a posting the store already describes, and leaves it out', async () => {
    const fake = fakeOracle()
    const seen = []
    const known = (source, id) => { seen.push([source, id]); return id === intern.Id }
    const out = await run(fake, {}, { known })
    expect(seen[0]).toEqual(['oracle:acme', embedded.Id])
    expect(details(fake)).toEqual([embedded.Id, data.Id])
    expect(out.map((r) => r.title)).toEqual([embedded.Title, data.Title])
  })

  it('asks for no detail of a posting the filter would drop', async () => {
    const fake = fakeOracle()
    const out = await run(fake, {}, { wanted: (source, raw) => raw.title !== data.Title })
    expect(details(fake)).toEqual([embedded.Id, intern.Id])
    expect(out).toHaveLength(2)
  })

  it('shows the filter the listed row with every place it names', async () => {
    const raws = []
    await run(fakeOracle(), {}, { wanted: (source, raw) => { raws.push(raw); return true } })
    expect(raws[0]).toEqual({ externalId: embedded.Id, title: embedded.Title, company: 'Acme', location: 'Bengaluru, Karnataka, India' })
    expect(raws[2].location).toBe('Singapore / Hyderabad, Telangana, India')
  })

  it('reports nothing wrong when every listed posting is already known', async () => {
    const fake = fakeOracle()
    expect(await run(fake, {}, { known: () => true })).toEqual([])
    expect(details(fake)).toEqual([])
  })
})

// The same wanted() scrape.js builds, over the real relevance floor.
describe('oracle listed rows against config/filters.json', () => {
  const rules = JSON.parse(readFileSync(new URL('../../../config/filters.json', import.meta.url), 'utf8'))
  const wanted = (source, raw) => filter(normalize(raw, source), rules)

  it('keeps an engineering role in and beside India, and drops a sales one', async () => {
    const sales = { ...intern, Id: '25000199', Title: 'Regional Sales Manager' }
    const fake = fakeOracle({ page: () => ({ items: [{ TotalJobsCount: 3, requisitionList: [embedded, sales, data] }] }) })
    const out = await run(fake, {}, { wanted })
    expect(out.map((r) => r.title)).toEqual([embedded.Title, data.Title])
  })
})
