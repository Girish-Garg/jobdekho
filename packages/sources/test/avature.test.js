import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { avature } from '@jobdekho/sources/providers/avature.js'
import { parseSite } from '@jobdekho/sources/providers/avature-site.js'
import { parseList } from '@jobdekho/sources/providers/avature-rows.js'
import { parseDetail } from '@jobdekho/sources/providers/avature-page.js'
import { dateFrom } from '@jobdekho/sources/providers/avature-dates.js'
import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'

// Trimmed on 2026-09-30 from real portals, with names, ids and text replaced:
// a list page in Lenovo's template (bare subtitle spans, jobOffset paging)
// and one in Siemens' (a location class, folderOffset paging, no slug in the
// posting URL); a posting page in the field template Siemens, Lenovo and EA
// share, and one with Deloitte's schema.org block and view items.
const read = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const JOBS = read('avature-search-jobs.html')
const FOLDERS = read('avature-search-folders.html')
const FIELDS = read('avature-detail-fields.html')
const LD = read('avature-detail-ld.html')

const LIST_URL = 'https://jobs.acme.com/en_US/careers/SearchJobs/?13036%5B0%5D=12016672&listFilterMode=1'
const noPause = async () => {}

// Serves list pages by offset and posting pages by id, as text, recording
// every request so the tests can assert what was sent and how much.
function fakeAvature({ pages = { 0: JOBS }, detail = () => FIELDS, fail = () => null } = {}) {
  const calls = []
  const http = async (url, opts = {}) => {
    calls.push({ url, accept: opts.headers?.Accept })
    const failure = fail(url, calls.length)
    if (failure) throw new Error(failure)
    const u = new URL(url)
    if (u.pathname.includes('/SearchJobs')) {
      const offset = Number(u.searchParams.get('jobOffset') || u.searchParams.get('folderOffset') || 0)
      const html = pages[offset]
      if (html == null) throw new Error(`HTTP 404 for ${url}`)
      return { text: async () => html }
    }
    const id = u.pathname.match(/(\d+)\/?$/)?.[1]
    const html = detail(id)
    if (html == null) throw new Error(`HTTP 404 for ${url}`)
    return { text: async () => html }
  }
  return { http, calls }
}

const run = (fake, context, extra = {}) =>
  avature({ url: LIST_URL, company: 'Acme', ...extra }, { pause: noPause }).fetch(fake.http, context)

// A list page of `n` rows starting at `from`, linking the next page while
// there is one, in the jobOffset form.
const pageOf = (from, n, total) => {
  const rows = Array.from({ length: n }, (_, i) =>
    `<article class="article article--result"><h3><a href="https://jobs.acme.com/en_US/careers/JobDetail/Engineer/${from + i + 1}">Engineer ${from + i + 1}</a></h3></article>`).join('')
  const next = from + n < total
    ? `<a href="https://jobs.acme.com/en_US/careers/SearchJobs/?13036=%5B12016672%5D&amp;listFilterMode=1&amp;jobRecordsPerPage=${n}&amp;jobOffset=${from + n}">Next</a>`
    : ''
  return `<html><body>${rows}${next}</body></html>`
}
const pagesOf = (size, total) => Object.fromEntries(Array.from({ length: Math.ceil(total / size) }, (_, k) => [k * size, pageOf(k * size, Math.min(size, total - k * size), total)]))

describe('avature site', () => {
  it('keeps the SearchJobs URL as copied, filter and all', () => {
    expect(parseSite(LIST_URL)).toEqual({ origin: 'https://jobs.acme.com', listUrl: LIST_URL, label: 'acme' })
  })

  it('names a shared avature.net portal by its tenant', () => {
    expect(parseSite('https://acme.avature.net/en_US/careers/SearchJobs').label).toBe('acme')
  })

  it('returns null for anything that is not a SearchJobs page', () => {
    expect(parseSite('https://jobs.acme.com/en_US/careers/JobDetail/1')).toBeNull()
    expect(parseSite('not a url')).toBeNull()
    expect(parseSite(undefined)).toBeNull()
  })

  it('names itself by host, or by an explicit slug', () => {
    expect(avature({ url: LIST_URL }).name).toBe('avature:acme')
    expect(avature({ url: LIST_URL, slug: 'acme-usi' }).name).toBe('avature:acme-usi')
  })

  it('builds from a bad URL and fails only when fetched', async () => {
    const a = avature({ url: 'https://jobs.acme.com/careers', slug: 'acme' })
    expect(a.name).toBe('avature:acme')
    await expect(a.fetch(async () => ({}))).rejects.toThrow('SearchJobs')
  })
})

describe('avature dates', () => {
  it('reads every way a portal prints one, as midnight UTC', () => {
    expect(dateFrom('Posted 30-Sep-2026')).toBe('2026-09-30T00:00:00.000Z')
    expect(dateFrom('Wednesday, September 30, 2026')).toBe('2026-09-30T00:00:00.000Z')
    expect(dateFrom('2026-09-25')).toBe('2026-09-25T00:00:00.000Z')
    expect(dateFrom('Sep 3, 2026')).toBe('2026-09-03T00:00:00.000Z')
  })

  it('returns null for what is not a real date', () => {
    expect(dateFrom('31-Feb-2026')).toBeNull()
    expect(dateFrom('Req #: WD00106024')).toBeNull()
    expect(dateFrom('')).toBeNull()
    expect(dateFrom(undefined)).toBeNull()
  })
})

describe('avature list page', () => {
  it('reads each posting once, by the id at the end of its link', () => {
    const { rows } = parseList(JOBS, LIST_URL)
    expect(rows.map((r) => r.id)).toEqual(['82184', '82113', '79073'])
    expect(rows[0]).toEqual({
      id: '82184',
      title: 'Linux Infrastructure Engineer - (RHEL/ SUSE)',
      url: 'https://jobs.acme.com/en_US/careers/JobDetail/Linux-Infrastructure-Engineer-RHEL-SUSE/82184',
      location: 'India, Karnataka, BANGALORE',
      postedAt: '2026-09-29T00:00:00.000Z',
    })
  })

  it('leaves "Multiple Locations" and a business unit out of the place', () => {
    const { rows } = parseList(JOBS, LIST_URL)
    expect(rows[1].location).toBe('')
    expect(rows[1].postedAt).toBeNull()
  })

  it('follows the site pagination to the nearest later offset, not another locale', () => {
    expect(parseList(JOBS, LIST_URL).next).toBe(
      'https://jobs.acme.com/en_US/careers/SearchJobs/?13036=%5B12016672%5D&13036_format=6621&listFilterMode=1&jobRecordsPerPage=10&jobOffset=10')
  })

  it('reads a folder-paged portal whose postings have no slug', () => {
    const url = 'https://jobs.acme.com/en_US/externaljobs/SearchJobs/?42386%5B0%5D=812053&listFilterMode=1'
    const { rows, next } = parseList(FOLDERS, url)
    expect(rows.map((r) => [r.id, r.title, r.location])).toEqual([
      ['524318', 'Software Developer - Automation', 'Thane, Maharashtra, India'],
      ['524283', 'Project Executive \u2013 Operations & Digital Transformation', 'Gurugram, Haryana, India'],
    ])
    expect(new URL(next).searchParams.get('folderOffset')).toBe('6')
  })

  it('has no next page on the last one', () => {
    expect(parseList(pageOf(10, 3, 13), `${LIST_URL}&jobOffset=10`).next).toBeNull()
    expect(parseList('', LIST_URL)).toEqual({ rows: [], next: null })
  })
})

describe('avature posting page', () => {
  it('reads the field template: prose, place, date and work mode', () => {
    const d = parseDetail(FIELDS)
    expect(d.description).toContain('You will build automation software in C# & Python.')
    expect(d.description).toContain('B.E./B.Tech in Computer Science')
    expect(d.description).not.toMatch(/<[a-z/]|&amp;/)
    expect(d.location).toBe('Thane - Maharashtra - India')
    expect(d.postedAt).toBe('2026-09-28T00:00:00.000Z')
    expect(d.workMode).toBe('Hybrid (Remote/Office)')
  })

  it('leaves hidden fields and labelled facts out of the description', () => {
    const d = parseDetail(FIELDS)
    expect(d.description).not.toContain('Internal recruiter notes')
    expect(d.description).not.toContain('Early Professional')
    expect(d.description).not.toContain('524318')
  })

  it('prefers the schema.org description and date, and reads the header place', () => {
    const d = parseDetail(LD)
    expect(d.description).toContain('Join the Industry & Client Portfolio team')
    expect(d.description).toContain("Master's Degree in Economics or Statistics")
    expect(d.description).not.toContain('Our purpose')
    expect(d.postedAt).toBe('2026-09-25T00:00:00.000Z')
    expect(d.location).toBe('Hyderabad, Telangana, India')
  })

  // Lenovo splits the place into three labelled fields and dates a posting
  // in words; EA prints "Locations:" in an unlabelled block of its own.
  it('joins a split city, state and country, once each', () => {
    const field = (label, value) => `<div class="article__content__view__field"><div class="article__content__view__field__label">${label}</div><div class="article__content__view__field__value">${value}</div></div>`
    const html = field('City:', 'Bengaluru') + field('State:', 'Bengaluru') + field('Country/Region:', 'India') +
      field('Date:', 'Wednesday, September 30, 2026') + '<div class="article__content__view__field"><div class="article__content__view__field__value"><p>Build it.</p></div></div>'
    expect(parseDetail(html)).toMatchObject({ location: 'Bengaluru, India', postedAt: '2026-09-30T00:00:00.000Z', description: 'Build it.' })
  })

  it('reads an unlabelled locations block and keeps it out of the description', () => {
    const html = '<div class="article__content__view__field field--locations"><div class="article__content__view__field__value"><strong>Locations</strong>: Hyderabad, Telangana, India&nbsp;<br></div></div>' +
      '<div class="article__content__view__field"><div class="article__content__view__field__value">Make play happen.</div></div>'
    expect(parseDetail(html)).toMatchObject({ location: 'Hyderabad, Telangana, India', description: 'Make play happen.' })
  })

  it('keeps a list of additional locations out of the description', () => {
    const block = (text) => `<div class="article__content__view__field"><div class="article__content__view__field__value">${text}</div></div>`
    const html = block('Additional Locations:<br>* India - Bangalore<br>* India - Pune') + block('We are Acme. We build laptops.')
    expect(parseDetail(html).description).toBe('We are Acme. We build laptops.')
  })

  it('returns blanks, not a throw, for a page it cannot read', () => {
    expect(parseDetail('<script type="application/ld+json">{oops</script>')).toEqual({ description: '', location: '', postedAt: null, workMode: '' })
  })
})

describe('avature adapter', () => {
  it('asks for the configured page as HTML, then the next, then each new posting', async () => {
    const fake = fakeAvature({ pages: { 0: JOBS, 10: pageOf(10, 0, 10) } })
    await run(fake)
    expect(fake.calls[0]).toEqual({ url: LIST_URL, accept: 'text/html,application/xhtml+xml' })
    expect(new URL(fake.calls[1].url).searchParams.get('jobOffset')).toBe('10')
    expect(fake.calls.slice(2).map((c) => c.url.match(/\d+$/)[0])).toEqual(['82184', '82113', '79073'])
    for (const c of fake.calls) expect(c.accept).toBe('text/html,application/xhtml+xml')
  })

  it('maps a listed row and its page to RawPosting', async () => {
    const fake = fakeAvature({ pages: { 0: JOBS, 10: pageOf(10, 0, 10) } })
    const [r] = await run(fake)
    expect(r).toEqual({
      externalId: '82184',
      title: 'Linux Infrastructure Engineer - (RHEL/ SUSE)',
      company: 'Acme',
      location: 'Thane - Maharashtra - India',
      url: 'https://jobs.acme.com/en_US/careers/JobDetail/Linux-Infrastructure-Engineer-RHEL-SUSE/82184',
      description: expect.stringContaining('automation software'),
      tags: ['Hybrid (Remote/Office)'],
      postedAt: '2026-09-28T00:00:00.000Z',
    })
    expect(r.level).toBeUndefined()
    expect(r.type).toBeUndefined()
  })

  it('keeps the list place and date when the page gives none', async () => {
    const bare = '<div class="article__content__view__field"><div class="article__content__view__field__value">Body only.</div></div>'
    const fake = fakeAvature({ pages: { 0: JOBS, 10: pageOf(10, 0, 10) }, detail: () => bare })
    const [r] = await run(fake)
    expect(r.location).toBe('India, Karnataka, BANGALORE')
    expect(r.postedAt).toBe('2026-09-29T00:00:00.000Z')
  })

  it('follows pages until one adds nothing, and lists at most 100', async () => {
    const fake = fakeAvature({ pages: pagesOf(20, 336), detail: () => FIELDS })
    const out = await run(fake)
    const lists = fake.calls.filter((c) => c.url.includes('/SearchJobs'))
    expect(lists).toHaveLength(5)
    expect(fake.calls.filter((c) => c.url.includes('/JobDetail/'))).toHaveLength(40)
    expect(out).toHaveLength(40)
    expect(out[0].externalId).toBe('1')
  })

  it('reads no more than ten pages of a portal that pages by six', async () => {
    const fake = fakeAvature({ pages: pagesOf(6, 934) })
    await run(fake, { known: () => true })
    expect(fake.calls.filter((c) => c.url.includes('/SearchJobs'))).toHaveLength(10)
  })

  it('stops at the last page', async () => {
    const fake = fakeAvature({ pages: pagesOf(10, 25) })
    const out = await run(fake)
    expect(fake.calls.filter((c) => c.url.includes('/SearchJobs'))).toHaveLength(3)
    expect(out).toHaveLength(25)
  })

  it('pauses before every request after the first', async () => {
    let pauses = 0
    const fake = fakeAvature({ pages: pagesOf(10, 12) })
    await avature({ url: LIST_URL }, { pause: async () => { pauses++ } }).fetch(fake.http)
    expect(pauses).toBe(fake.calls.length - 1)
  })

  it('returns an empty list for an empty board', async () => {
    const fake = fakeAvature({ pages: { 0: '<html><body>No results</body></html>' } })
    expect(await run(fake)).toEqual([])
    expect(fake.calls).toHaveLength(1)
  })
})

describe('avature failures', () => {
  const pages = pagesOf(10, 3)

  it('leaves out only the posting whose page failed', async () => {
    const fake = fakeAvature({ pages, fail: (url) => (url.endsWith('/2') ? 'timeout' : null) })
    expect((await run(fake)).map((r) => r.externalId)).toEqual(['1', '3'])
  })

  it('sends nothing more once the portal answers 429, keeps what it read, and says so', async () => {
    const fake = fakeAvature({ pages, fail: (url) => (url.endsWith('/2') ? `HTTP 429 for ${url}` : null) })
    const adapter = avature({ url: LIST_URL }, { pause: noPause })
    expect((await adapter.fetch(fake.http)).map((r) => r.externalId)).toEqual(['1'])
    expect(fake.calls.at(-1).url).toMatch(/\/2$/)
    expect(adapter.note).toContain('429')
  })

  it('stops listing on a 429 and still describes what it listed', async () => {
    const fake = fakeAvature({ pages: pagesOf(10, 30), fail: (url) => (url.includes('jobOffset=10') ? `HTTP 429 for ${url}` : null) })
    const adapter = avature({ url: LIST_URL }, { pause: noPause })
    expect(await adapter.fetch(fake.http)).toHaveLength(10)
    expect(fake.calls.some((c) => c.url.includes('jobOffset=20'))).toBe(false)
    expect(adapter.note).toContain('429')
  })

  it('ends the listing at a failed later page and describes the rest', async () => {
    const fake = fakeAvature({ pages: pagesOf(10, 30), fail: (url) => (url.includes('jobOffset=10') ? 'HTTP 502' : null) })
    const adapter = avature({ url: LIST_URL }, { pause: noPause })
    expect(await adapter.fetch(fake.http)).toHaveLength(10)
    expect(adapter.note).toBeUndefined()
  })

  // A portal whose template changed must show up as a failed source, not
  // as postings that quietly lost their bodies.
  it('reports a source none of whose posting pages can be read', async () => {
    await expect(run(fakeAvature({ pages, detail: () => '<html><body>Job details</body></html>' }))).rejects.toThrow('no detail could be read')
  })

  it('throws when the first page fails, so the run records why', async () => {
    await expect(run(fakeAvature({ fail: () => 'HTTP 403' }))).rejects.toThrow('HTTP 403')
  })

  // careers.ibm.com answered exactly this: 202, no body, a WAF header.
  it('reports a bot challenge as a refusal, not as an empty board', async () => {
    const challenged = async () => ({ status: 202, headers: new Headers({ 'x-amzn-waf-action': 'challenge' }), text: async () => '' })
    await expect(avature({ url: LIST_URL }, { pause: noPause }).fetch(challenged)).rejects.toThrow('bot challenge')
  })
})

describe('avature with the run context', () => {
  const pages = { 0: JOBS, 10: pageOf(10, 0, 10) }
  const asked = (fake) => fake.calls.filter((c) => c.url.includes('/JobDetail/')).map((c) => c.url.match(/(\d+)$/)[1])

  it('asks for no page of a posting the store already describes, and leaves it out', async () => {
    const fake = fakeAvature({ pages })
    const seen = []
    const known = (source, id) => { seen.push([source, id]); return id === '82113' }
    const out = await run(fake, { known })
    expect(seen[0]).toEqual(['avature:acme', '82184'])
    expect(asked(fake)).toEqual(['82184', '79073'])
    expect(out.map((r) => r.externalId)).toEqual(['82184', '79073'])
  })

  it('shows the filter the listed row, its place blank where the card gives none', async () => {
    const raws = []
    await run(fakeAvature({ pages }), { wanted: (source, raw) => { raws.push(raw); return true } })
    expect(raws.map((r) => r.location)).toEqual(['India, Karnataka, BANGALORE', '', 'India, Maharashtra, Mumbai'])
    expect(raws[0]).toEqual({ externalId: '82184', title: 'Linux Infrastructure Engineer - (RHEL/ SUSE)', company: 'Acme', location: 'India, Karnataka, BANGALORE' })
  })

  it('reports nothing wrong when every listed posting is already known', async () => {
    const fake = fakeAvature({ pages })
    expect(await run(fake, { known: () => true })).toEqual([])
    expect(asked(fake)).toEqual([])
  })
})

// The same wanted() scrape.js builds, over the real relevance floor.
describe('avature listed rows against config/filters.json', () => {
  const rules = JSON.parse(readFileSync(new URL('../../../config/filters.json', import.meta.url), 'utf8'))
  const wanted = (source, raw) => filter(normalize(raw, source), rules)

  it('keeps engineering roles, the multi-city one included, and drops a recruiting one', async () => {
    const fake = fakeAvature({ pages: { 0: JOBS, 10: pageOf(10, 0, 10) } })
    const out = await run(fake, { wanted })
    expect(out.map((r) => r.externalId)).toEqual(['82184', '82113'])
  })
})
