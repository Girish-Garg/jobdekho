import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { successfactors } from '@jobdekho/sources/providers/successfactors.js'
import { parseSite } from '@jobdekho/sources/providers/successfactors-site.js'
import { parseSearch } from '@jobdekho/sources/providers/successfactors-rows.js'
import { parseJob } from '@jobdekho/sources/providers/successfactors-job.js'
import { placeName, distinctCities } from '@jobdekho/sources/providers/successfactors-place.js'
import { UNIFY_ERROR } from '@jobdekho/sources/providers/successfactors-list.js'
import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'

// Trimmed from live Career Site Builder pages on 2026-09-30 (YASH's India
// search and job page, Tata Power's tile search, Wipro's Unify search
// shell), with the company, ids and text replaced: a table search page of
// three rows, a tile page of two, a Unify shell, and one job page.
const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const SEARCH = fixture('successfactors-search.html')
const UNIFY = fixture('successfactors-search-unify.html')
const TILES = fixture('successfactors-search-tiles.html')
const JOB = fixture('successfactors-job.html')

const HOME = 'https://careers.acme.com/'
const noPause = async () => {}

const P101 = '/job/Hyderabad-Software-Engineer-Data-Platform/1400000101/'
const P102 = '/job/Pune-Graduate-Engineer-Trainee-MH-411014/1400000102/'
const P103 = '/job/Mumbai-Regional-Sales-Manager-MH/1400000103/'

// The other two rows get a page each, built from the captured one. The
// trainee's page has no datePosted and no address, so what the list said
// has to stand in for both.
const withTitle = (html, title) => html.replace(/(itemprop="title"[^>]*>)[^<]*/, `$1${title}`)
const JOBS = {
  [P101]: JOB,
  [P102]: withTitle(JOB, 'Graduate Engineer Trainee')
    .replace(/<meta itemprop="datePosted"[^>]*>/, '')
    .replace(/<meta itemprop="(addressLocality|addressRegion|addressCountry|streetAddress)"[^>]*>/g, ''),
  [P103]: withTitle(JOB, 'Regional Sales Manager'),
}

// A search page of any size, in the fixture's row markup, for the paging
// tests; its rows are "Engineer <n>" at /job/Pune-Engineer-<n>/<n>/.
const row = (n) => `<tr class="data-row"><td class="colTitle"><span class="jobTitle hidden-phone"><a href="/job/Pune-Engineer-${n}/${n}/" class="jobTitle-link">Engineer ${n}</a></span></td><td class="colLocation hidden-phone"><span class="jobLocation">Pune, MH, IN</span></td></tr>`
const page = (ids, total) => `<html><body class="coreCSB search-page body   body"><span class="paginationLabel">Results <b>x</b> of <b>${total}</b></span><table><tbody>${ids.map(row).join('')}</tbody></table></body></html>`
const range = (from, count) => Array.from({ length: count }, (_, i) => from + i)
const anyJob = () => JOB

// Routes on path the way the real site does, and records every request so
// the tests can assert what was sent and how much.
function fakeSite({ search = () => SEARCH, jobs = (path) => JOBS[path], fail = () => null } = {}) {
  const calls = []
  const http = async (url, opts = {}) => {
    calls.push({ url, accept: opts.headers?.Accept })
    const failure = fail(url, calls.length)
    if (failure) throw new Error(failure)
    const u = new URL(url)
    if (u.pathname.endsWith('/search/')) return { text: async () => search(Number(u.searchParams.get('startrow')), u) }
    const html = jobs(u.pathname)
    if (html == null) throw new Error(`HTTP 404 for ${url}`)
    return { text: async () => html }
  }
  return { http, calls }
}

const build = (entry = {}, opts = {}) => successfactors({ url: HOME, company: 'Acme', ...entry }, { pause: noPause, ...opts })
const run = (fake, entry, context) => build(entry).fetch(fake.http, context)
const searches = (fake) => fake.calls.filter((c) => c.url.includes('/search/'))
const jobCalls = (fake) => fake.calls.filter((c) => c.url.includes('/job/')).map((c) => new URL(c.url).pathname)

describe('successfactors site URL', () => {
  it('reads the root, the India search and job URLs from the home page URL', () => {
    const s = parseSite(HOME)
    expect(s.label).toBe('acme')
    expect(s.root).toBe('https://careers.acme.com')
    expect(s.searchUrl(25)).toBe('https://careers.acme.com/search/?q=&locationsearch=India&sortColumn=referencedate&sortDirection=desc&startrow=25')
    expect(s.jobUrl(P101)).toBe(`https://careers.acme.com${P101}`)
  })

  // EY's jobs sit under careers.ey.com/ey/, and its row links carry /ey/.
  it('keeps a brand path and cuts off a copied search URL', () => {
    const s = parseSite('https://careers.acme.com/acme/search/?q=&locationsearch=India&startrow=0')
    expect(s.root).toBe('https://careers.acme.com/acme')
    expect(s.searchUrl(0)).toMatch(/^https:\/\/careers\.acme\.com\/acme\/search\/\?/)
    expect(s.jobUrl('/acme/job/Pune-X/1/')).toBe('https://careers.acme.com/acme/job/Pune-X/1/')
  })

  it('cuts off a copied job URL and names the source by the host word', () => {
    const s = parseSite('https://jobs.acmegroup.com/job/Pune-Engineer/123/')
    expect(s.root).toBe('https://jobs.acmegroup.com')
    expect(s.label).toBe('acmegroup')
    expect(parseSite('https://careers.acme.co.in/').label).toBe('acme')
  })

  // Their robots.txt says "Disallow: /".
  it("refuses SAP's own career hosts", () => {
    expect(parseSite('https://career10.successfactors.com/career?company=acmeP')).toBeNull()
    expect(parseSite('https://career2.successfactors.eu/career?company=acme')).toBeNull()
    expect(parseSite('https://career55.sapsf.eu/career?company=acmeP2')).toBeNull()
  })

  it('returns null for anything that is not a web URL', () => {
    expect(parseSite('not a url')).toBeNull()
    expect(parseSite('ftp://careers.acme.com/')).toBeNull()
    expect(parseSite(undefined)).toBeNull()
  })
})

describe('successfactors adapter naming', () => {
  it('names itself by host word, or by an explicit slug', () => {
    expect(successfactors({ url: HOME }).name).toBe('successfactors:acme')
    expect(successfactors({ url: HOME, slug: 'acme-in' }).name).toBe('successfactors:acme-in')
  })

  // buildAdapters runs before any fetch; a bad URL must not throw there and
  // take every other source down with it.
  it('builds from a bad URL and fails only when fetched', async () => {
    const a = successfactors({ url: 'https://career10.successfactors.com/career?company=acmeP', slug: 'acme' })
    expect(a.name).toBe('successfactors:acme')
    await expect(a.fetch(async () => ({}))).rejects.toThrow('Career Site Builder URL')
  })

  it('falls back to the capitalised host word when config names no company', async () => {
    const [r] = await successfactors({ url: HOME }, { pause: noPause }).fetch(fakeSite().http)
    expect(r.company).toBe('Acme')
  })
})

describe('successfactors search page', () => {
  it('reads each row once, with its id, link and title', () => {
    const { rows } = parseSearch(SEARCH)
    expect(rows.map((r) => r.id)).toEqual(['1400000101', '1400000102', '1400000103'])
    expect(rows[0].href).toBe(P101)
    expect(rows[0].title).toBe('Software Engineer - Data Platform')
  })

  it('reads the place without its "+2 more", and the date', () => {
    const [r, t] = parseSearch(SEARCH).rows
    expect(r.location).toBe('Hyderabad, IN')
    expect(t.location).toBe('Pune, MH, IN, 411014')
    expect(r.date).toBe('Sep 30, 2026')
  })

  it('reads the total and knows a classic page from a Unify shell', () => {
    expect(parseSearch(SEARCH)).toMatchObject({ total: 3, unify: false })
    expect(parseSearch(UNIFY)).toEqual({ rows: [], total: 0, unify: true })
    expect(parseSearch('')).toEqual({ rows: [], total: 0, unify: false })
  })

  // Tata Power's layout: one tile per job, each repeating its link for
  // desktop and phone, and showing a department but no place.
  it('reads the tile layout, its brand path and its count', () => {
    const { rows, total } = parseSearch(TILES)
    expect(total).toBe(2)
    expect(rows.map((r) => r.id)).toEqual(['1500000201', '1500000202'])
    expect(rows[0]).toMatchObject({
      href: '/AcmeMumbai/job/MUMBAI%2C-HEAD-OFFICE-Software-Engineer-SCADA-0-0/1500000201/',
      title: 'Software Engineer - SCADA & Grid Systems',
      location: '',
    })
  })
})

describe('successfactors places', () => {
  it("writes out India's code only where the country stands", () => {
    expect(placeName('Kolkata, WB, IN, 700091')).toBe('Kolkata, WB, India')
    expect(placeName('Pune, IN')).toBe('Pune, India')
    expect(placeName('IN')).toBe('India')
    expect(placeName('Indianapolis, IN, US')).toBe('Indianapolis, IN, US')
    expect(placeName('Bengaluru, Karnataka, India')).toBe('Bengaluru, Karnataka, India')
    expect(placeName(undefined)).toBe('')
  })

  it('keeps the first spelling of each city', () => {
    expect(distinctCities(['Pune, MH, India', 'Pune, India', 'Hyderabad, India'])).toEqual(['Pune, MH, India', 'Hyderabad, India'])
  })
})

describe('successfactors job page', () => {
  it('reads title, date, every place and the body from the JobPosting microdata', () => {
    const j = parseJob(JOB)
    expect(j.title).toBe('Software Engineer - Data Platform')
    expect(j.datePosted).toBe('Wed Sep 30 00:00:00 UTC 2026')
    expect(j.places).toEqual(['Bangalore, KA, India', 'Pune, MH, India', 'Hyderabad, India'])
    expect(j.description).toContain('B.Tech in Computer Science')
  })

  it('returns null for a page with no posting on it', () => {
    expect(parseJob(UNIFY)).toBeNull()
    expect(parseJob('')).toBeNull()
  })
})

describe('successfactors listing', () => {
  it("asks the site's own search for India, newest first, as a browser page", async () => {
    const fake = fakeSite()
    await run(fake)
    expect(fake.calls[0].url).toBe(parseSite(HOME).searchUrl(0))
    expect(fake.calls.every((c) => c.accept === 'text/html')).toBe(true)
  })

  it('steps by the rows each page held, up to the reported total', async () => {
    const fake = fakeSite({ search: (start) => page(range(start + 1, start === 20 ? 5 : 10), 25), jobs: anyJob })
    const out = await run(fake)
    expect(searches(fake).map((c) => new URL(c.url).searchParams.get('startrow'))).toEqual(['0', '10', '20'])
    expect(out).toHaveLength(25)
  })

  // A 10-row site would need ten pages to list 100; it stops at five.
  it('reads at most five pages however small they are', async () => {
    const fake = fakeSite({ search: (start) => page(range(start + 1, 10), 328), jobs: anyJob })
    await run(fake)
    expect(searches(fake)).toHaveLength(5)
  })

  it('lists at most 100 rows and reads at most 40 job pages', async () => {
    const fake = fakeSite({ search: (start) => page(range(start + 1, 25), 2637), jobs: anyJob })
    const out = await run(fake)
    expect(searches(fake)).toHaveLength(4)
    expect(jobCalls(fake)).toHaveLength(40)
    expect(out).toHaveLength(40)
    expect(out[0].externalId).toBe('1')
  })

  // A posting published between two page requests pushes a row onto the
  // next page, where it is seen again.
  it('keeps a row seen on two pages once', async () => {
    const fake = fakeSite({ search: (start) => page(start === 0 ? [1, 2] : [2, 3], 4), jobs: anyJob })
    const out = await run(fake)
    expect(out.map((r) => r.externalId)).toEqual(['1', '2', '3'])
  })

  it('returns an empty list for a board with no India jobs, reading no job page', async () => {
    const fake = fakeSite({ search: () => page([], 0) })
    expect(await run(fake)).toEqual([])
    expect(fake.calls).toHaveLength(1)
  })

  it('refuses a Unify site, whose jobs come only from a path robots.txt disallows', async () => {
    const fake = fakeSite({ search: () => UNIFY })
    await expect(run(fake)).rejects.toThrow(UNIFY_ERROR)
    expect(UNIFY_ERROR).toContain('robots.txt')
    expect(fake.calls).toHaveLength(1)
  })

  it('fails loudly when the page reports jobs but no row can be read', async () => {
    const fake = fakeSite({ search: () => '<span class="paginationLabel">Results <b>1</b> of <b>40</b></span><div class="job-card"><a href="/job/x/1/">X</a></div>' })
    await expect(run(fake)).rejects.toThrow('reports 40 jobs but no row could be read')
  })

  it('throws when the first page fails, so the run records why', async () => {
    const fake = fakeSite({ fail: (url) => (url.includes('/search/') ? 'HTTP 500 for search' : null) })
    await expect(run(fake)).rejects.toThrow('HTTP 500')
  })

  it('skips a failed later page and reads the rest', async () => {
    const fake = fakeSite({
      search: (start) => page(range(start + 1, 10), 30),
      jobs: anyJob,
      fail: (url) => (url.endsWith('startrow=10') ? 'HTTP 502 for page two' : null),
    })
    const out = await run(fake)
    expect(searches(fake).map((c) => c.url.split('startrow=')[1])).toEqual(['0', '10', '20'])
    expect(out.map((r) => r.externalId)).toEqual([...range(1, 10), ...range(21, 10)].map(String))
  })

  it('pauses before every request after the first', async () => {
    let pauses = 0
    const fake = fakeSite()
    await build({}, { pause: async () => { pauses++ } }).fetch(fake.http)
    expect(fake.calls).toHaveLength(4)
    expect(pauses).toBe(3)
  })

  // HTML pages rendered per request: one at a time per board, never a burst.
  it('keeps one request in flight at a time', async () => {
    let inFlight = 0
    let peak = 0
    const base = fakeSite({ search: (start) => page(range(start + 1, 10), 10), jobs: anyJob })
    const http = async (url, opts) => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 1))
      inFlight--
      return base.http(url, opts)
    }
    const out = await build().fetch(http)
    expect(out).toHaveLength(10)
    expect(peak).toBe(1)
  })
})

describe('successfactors postings', () => {
  it('maps a listed row and its page to RawPosting', async () => {
    const [r] = await run(fakeSite())
    expect(r.externalId).toBe('1400000101')
    expect(r.title).toBe('Software Engineer - Data Platform')
    expect(r.company).toBe('Acme')
    expect(r.url).toBe(`https://careers.acme.com${P101}`)
    expect(r.tags).toEqual([])
  })

  it('names every place the page lists, with India written out', async () => {
    const [r] = await run(fakeSite())
    expect(r.location).toBe('Bangalore, KA, India / Pune, MH, India / Hyderabad, India')
  })

  it('carries the body as plain text, degree requirement included', async () => {
    const [r] = await run(fakeSite())
    expect(r.description).toContain("Acme's data team builds the pipelines behind every report.")
    expect(r.description).toContain('B.Tech in Computer Science')
    expect(r.description).toContain('Spark & SQL')
    expect(r.description).not.toMatch(/<[a-z/]|&#39;|&amp;/)
  })

  it('dates a posting by its datePosted, else by the list date at midnight UTC', async () => {
    const [r, t] = await run(fakeSite())
    expect(r.postedAt).toBe('2026-09-30T00:00:00.000Z')
    expect(t.postedAt).toBe('2026-09-29T00:00:00.000Z')
  })

  // A tile names no place, so the filter sees none (no objection) and the
  // job page, fetched under the tile's own brand path, supplies them all.
  it('describes tile rows from their job pages', async () => {
    const fake = fakeSite({ search: () => TILES, jobs: anyJob })
    const raws = []
    const out = await run(fake, {}, { wanted: (source, raw) => raws.push(raw) > 0 })
    expect(raws.map((r) => r.location)).toEqual(['', ''])
    expect(jobCalls(fake)[0]).toBe('/AcmeMumbai/job/MUMBAI%2C-HEAD-OFFICE-Software-Engineer-SCADA-0-0/1500000201/')
    expect(out[0].location).toBe('Bangalore, KA, India / Pune, MH, India / Hyderabad, India')
  })

  it('falls back to the listed place when the page names none', async () => {
    const [, t] = await run(fakeSite())
    expect(t.title).toBe('Graduate Engineer Trainee')
    expect(t.location).toBe('Pune, MH, India')
  })

  // No employment type is common to every site, so the title classifier in
  // core decides, and type is derived in core from level.
  it('sets neither level nor type', async () => {
    const out = await run(fakeSite())
    expect(out).toHaveLength(3)
    for (const r of out) {
      expect(r.level).toBeUndefined()
      expect(r.type).toBeUndefined()
    }
  })
})

describe('successfactors failures', () => {
  it('leaves out only the posting whose page failed', async () => {
    const fake = fakeSite({ fail: (url) => (url.endsWith(P102) ? 'timeout' : null) })
    const out = await run(fake)
    expect(out.map((r) => r.externalId)).toEqual(['1400000101', '1400000103'])
  })

  it('leaves out a posting whose page no longer holds one', async () => {
    const fake = fakeSite({ jobs: (path) => (path === P103 ? UNIFY : JOBS[path]) })
    const out = await run(fake)
    expect(out.map((r) => r.externalId)).toEqual(['1400000101', '1400000102'])
  })

  it('reports a source whose every job page fails', async () => {
    const fake = fakeSite({ jobs: () => undefined })
    await expect(run(fake)).rejects.toThrow('no job page could be read')
  })

  it('sends nothing more once a job page answers 429, keeps what it read and notes why', async () => {
    const fake = fakeSite({ fail: (url) => (url.endsWith(P102) ? `HTTP 429 for ${url}` : null) })
    const adapter = build()
    const out = await adapter.fetch(fake.http)
    expect(out.map((r) => r.externalId)).toEqual(['1400000101'])
    expect(fake.calls.at(-1).url).toContain(P102)
    expect(adapter.note).toContain('429')
  })

  it('keeps what it listed when a later page answers 429', async () => {
    const fake = fakeSite({
      search: (start) => page(range(start + 1, 10), 30),
      jobs: anyJob,
      fail: (url) => (url.endsWith('startrow=10') ? `HTTP 429 for ${url}` : null),
    })
    const adapter = build()
    const out = await adapter.fetch(fake.http)
    expect(searches(fake)).toHaveLength(2)
    expect(out).toHaveLength(10)
    expect(adapter.note).toContain('429')
  })

  // The runner retries a source that threw; that retry must not reach a
  // host that has just refused.
  it('throws on a 429 for the first page, and the retry sends nothing', async () => {
    const fake = fakeSite({ fail: () => 'HTTP 429 for search' })
    const adapter = build()
    await expect(adapter.fetch(fake.http)).rejects.toThrow('429')
    await expect(adapter.fetch(fake.http)).rejects.toThrow('will not be asked again')
    expect(fake.calls).toHaveLength(1)
  })
})

// The runner's context (apps/scraper/src/scrape.js): known says the store
// already holds a posting's body, wanted runs the relevance filter.
describe('successfactors with the run context', () => {
  it('reads no page for a posting the store already describes, and leaves it out', async () => {
    const fake = fakeSite()
    const seen = []
    const known = (source, id) => seen.push([source, id]) > 0 && id === '1400000102'
    const out = await run(fake, {}, { known })
    expect(seen[0]).toEqual(['successfactors:acme', '1400000101'])
    expect(jobCalls(fake)).toEqual([P101, P103])
    expect(out.map((r) => r.externalId)).toEqual(['1400000101', '1400000103'])
  })

  it('reads no page for a posting the filter would drop', async () => {
    const fake = fakeSite()
    const out = await run(fake, {}, { wanted: (source, raw) => raw.externalId !== '1400000103' })
    expect(jobCalls(fake)).toEqual([P101, P102])
    expect(out).toHaveLength(2)
  })

  // "Hyderabad, IN" alone would fail core's location rule, which reads
  // place names rather than country codes.
  it('shows the filter the listed row with India written out', async () => {
    const raws = []
    await run(fakeSite(), {}, { wanted: (source, raw) => raws.push(raw) > 0 })
    expect(raws[0]).toEqual({ externalId: '1400000101', title: 'Software Engineer - Data Platform', company: 'Acme', location: 'Hyderabad, India' })
    expect(raws[1].location).toBe('Pune, MH, India')
  })

  it('reports nothing wrong when every listed posting is already known', async () => {
    const fake = fakeSite()
    expect(await run(fake, {}, { known: () => true })).toEqual([])
    expect(jobCalls(fake)).toEqual([])
  })
})

// The same wanted() scrape.js builds, over the real relevance floor, and
// the finished postings through the same filter the pipeline applies.
describe('successfactors rows against config/filters.json', () => {
  const rules = JSON.parse(readFileSync(new URL('../../../config/filters.json', import.meta.url), 'utf8'))
  const wanted = (source, raw) => filter(normalize(raw, source), rules)

  it('keeps the engineering roles, drops the sales one, and the kept ones pass as Indian', async () => {
    const fake = fakeSite()
    const out = await run(fake, {}, { wanted })
    expect(out.map((r) => r.title)).toEqual(['Software Engineer - Data Platform', 'Graduate Engineer Trainee'])
    expect(jobCalls(fake)).toEqual([P101, P102])
    for (const r of out) expect(wanted('successfactors:acme', r)).toBe(true)
  })
})
