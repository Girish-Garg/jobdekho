import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { mercedesbenz } from '@jobdekho/sources/companies/mercedesbenz.js'
import { parseSearch } from '@jobdekho/sources/companies/mercedesbenz-list.js'
import { englishPage, jobPostingIn } from '@jobdekho/sources/companies/mercedesbenz-page.js'
import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'

// jobs.api.mercedes-benz.com's search for India and one ad's English page,
// as they answered on 2026-10-04, trimmed: six ads of five requisitions (one
// published twice, one in two spellings of Bengaluru, one at the financial
// services arm in Pune), and the page's JSON-LD with its body cut short.
const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const SEARCH = JSON.parse(fixture('mercedesbenz-search.json'))
const PAGE = fixture('mercedesbenz-ad.html')
const RULES = JSON.parse(readFileSync(new URL('../../../config/filters.json', import.meta.url), 'utf8'))
const noPause = async () => {}

const API = 'https://jobs.api.mercedes-benz.com/search'
const JUNIOR = 'https://jobs.mercedes-benz.com/en/junior-software-developer-python-and-node-js--239655-MER00040R3'

function fakeBoard({ search = () => SEARCH, page = () => PAGE, fail = () => null } = {}) {
  const urls = []
  const http = async (url) => {
    urls.push(url)
    const failure = fail(url)
    if (failure) throw new Error(failure)
    return url.startsWith(API) ? { json: async () => search(url) } : { text: async () => page(url) }
  }
  return { http, urls }
}

const run = (fake, context) => mercedesbenz({ pause: noPause }).fetch(fake.http, context)
const query = (url) => JSON.parse(new URL(url).searchParams.get('data'))
const ads = () => structuredClone(SEARCH.SearchResult.SearchResultItems)

describe('mercedesbenz adapter', () => {
  it("asks the board's API for India by its own country id, newest first, in one request", async () => {
    const fake = fakeBoard()
    await run(fake)
    expect(fake.urls[0].startsWith(`${API}?data=`)).toBe(true)
    const data = query(fake.urls[0])
    expect(data.LanguageCode).toBe('EN')
    expect(data.SearchCriteria).toEqual([{ CriterionName: 'PositionLocation.Country', CriterionValue: [390] }])
    expect(data.SearchParameters).toMatchObject({ FirstItem: 1, CountItem: 500, Sort: [{ Criterion: 'PublicationStartDate', Direction: 'DESC' }] })
    expect(fake.urls.filter((u) => u.startsWith(API))).toHaveLength(1)
  })

  it("keeps a requisition once, as its newest ad, and reads that ad's English page", async () => {
    const fake = fakeBoard()
    const out = await run(fake)
    expect(out.map((r) => r.externalId)).toEqual(['mer00048zv', 'mer00040r3', 'mer00048n6', 'mer000484t', 'mer0003rzv'])
    expect(fake.urls[1]).toBe('https://jobs.mercedes-benz.com/en/data-ai-engineer-240590-MER00048ZV')
    expect(fake.urls).toContain(JUNIOR)
    expect(fake.urls).not.toContain('https://jobs.mercedes-benz.com/en/data-ai-engineer-240586-MER00048ZV')
  })

  it('maps an ad and its page to RawPosting', async () => {
    const out = await run(fakeBoard())
    const r = out.find((p) => p.externalId === 'mer00040r3')
    expect(r.title).toBe('Junior Software Developer (Python and Node.js)')
    expect(r.company).toBe('Mercedes-Benz')
    expect(r.location).toBe('Bengaluru, India')
    expect(r.url).toBe(JUNIOR)
    expect(r.tags).toEqual(['Mercedes-Benz Research and Development India', 'IT/Telecommunications'])
    expect(r.postedAt).toBe('2026-09-24T00:00:00.000Z')
    expect(r.level).toBeUndefined()
  })

  it("keeps the page's body as plain text under its own headings", async () => {
    const [r] = await run(fakeBoard())
    expect(r.description.startsWith('Tasks\n\nJob Summary')).toBe(true)
    expect(r.description).toContain('Position: Junior Software Developer Level: Entry-Level / Junior')
    expect(r.description).toContain('- Develop and maintain backend services and APIs using Python and Node.js')
    expect(r.description).toContain('Qualifications\n\nWhy Join Us?')
    expect(r.description).not.toMatch(/<|&amp;/)
  })

  it('names each city once, however Bengaluru is spelled, and the entity it hires for', async () => {
    const out = await run(fakeBoard())
    expect(out.find((p) => p.externalId === 'mer00048n6').location).toBe('Bengaluru, India')
    expect(out.find((p) => p.externalId === 'mer00048zv').location).toBe('Bangalore, India')
    const pune = out.find((p) => p.externalId === 'mer0003rzv')
    expect(pune.location).toBe('Pune, India')
    expect(pune.tags[0]).toBe('Mercedes-Benz Financial Services India')
  })

  it('skips a posting the store has or the filter drops before its page is read', async () => {
    const fake = fakeBoard()
    const context = {
      known: (name, id) => name === 'mercedesbenz' && id === 'mer00048zv',
      wanted: (name, raw) => raw.title !== 'Finance Controlling',
    }
    const out = await run(fake, context)
    expect(out.map((r) => r.externalId)).toEqual(['mer00040r3', 'mer00048n6', 'mer0003rzv'])
    expect(fake.urls).toHaveLength(4)
  })

  // The run's filter turns down an ad already past the age cut, which the
  // pipeline would drop, before its page is read.
  it("hands the run's filter each ad's own date", async () => {
    const asked = []
    await run(fakeBoard(), { wanted: (name, raw) => (asked.push([raw.externalId, raw.postedAt]), false) })
    expect(asked[0]).toEqual(['mer00048zv', '2026-10-01T00:00:00.000Z'])
    expect(asked.at(-1)).toEqual(['mer0003rzv', '2026-08-11T00:00:00.000Z'])
  })

  // Every Indian ad came back, so a posting the board stops listing can be
  // closed; a board holding more than one request read cannot say so.
  it('says when it listed the whole of India', async () => {
    const adapter = mercedesbenz({ pause: noPause })
    await adapter.fetch(fakeBoard().http)
    expect(adapter.complete).toBe(true)
    const more = { ...SEARCH, SearchResult: { ...SEARCH.SearchResult, SearchResultCountAll: 900 } }
    await adapter.fetch(fakeBoard({ search: () => more }).http)
    expect(adapter.complete).toBe(false)
  })

  it('leaves out an ad whose page carries no JobPosting, or whose link leaves the board', async () => {
    const items = ads()
    items[2].MatchedObjectDescriptor.PositionURI = 'https://example.com/junior-239655'
    const fake = fakeBoard({
      search: () => ({ ...SEARCH, SearchResult: { ...SEARCH.SearchResult, SearchResultItems: items } }),
      page: (url) => (url.includes('MER000484T') ? '<html><body>Not found</body></html>' : PAGE),
    })
    const out = await run(fake)
    expect(out.map((r) => r.externalId)).toEqual(['mer00048zv', 'mer00048n6', 'mer0003rzv'])
    expect(fake.urls.some((u) => u.includes('example.com'))).toBe(false)
  })

  it('stops for the run when the API answers 429', async () => {
    const adapter = mercedesbenz({ pause: noPause })
    const fake = fakeBoard({ fail: () => `HTTP 429 for ${API}` })
    await expect(adapter.fetch(fake.http)).rejects.toThrow('mercedesbenz stopped')
    await expect(adapter.fetch(fake.http)).rejects.toThrow('mercedesbenz stopped')
    expect(fake.urls).toHaveLength(1)
  })

  it('passes core normalize and the default filters, and reads the junior role as entry', async () => {
    const out = await run(fakeBoard())
    const p = normalize(out.find((r) => r.externalId === 'mer00040r3'), 'mercedesbenz')
    expect(p.level).toBe('entry')
    expect(p.degreeMin).toBe('bachelors')
    expect(filter(p, RULES)).toBe(true)
  })
})

describe('mercedesbenz search and page', () => {
  // A changed shape, or an India id that came to mean another country, must
  // fail the source rather than read as a quiet board.
  it('throws a reply without a result list, or with no Indian ad in it', () => {
    expect(() => parseSearch({ error: { code: 400 } })).toThrow('without a result list')
    const abroad = ads().map((item) => {
      item.MatchedObjectDescriptor.PositionLocation = [{ Country: '329', CountryCode: 'DE', CityName: 'Sindelfingen' }]
      return item
    })
    expect(() => parseSearch({ SearchResult: { SearchResultItems: abroad, SearchResultCountAll: 6 } })).toThrow('ads elsewhere')
    expect(parseSearch({ SearchResult: { SearchResultItems: [], SearchResultCountAll: 0 } })).toEqual({ rows: [], complete: true })
  })

  it('turns an ad link into its English page, on the board alone', () => {
    expect(englishPage('https://jobs.mercedes-benz.com/finance-controlling-238772-MER000484T'))
      .toBe('https://jobs.mercedes-benz.com/en/finance-controlling-238772-MER000484T')
    expect(englishPage('https://jobs.mercedes-benz.com/de/finance-controlling-238772-MER000484T'))
      .toBe('https://jobs.mercedes-benz.com/en/finance-controlling-238772-MER000484T')
    expect(englishPage('https://jobs.mercedes-benz.com/')).toBeNull()
    expect(englishPage('http://jobs.mercedes-benz.com/x-1')).toBeNull()
    expect(englishPage('https://example.com/x-1')).toBeNull()
    expect(englishPage(undefined)).toBeNull()
  })

  it("finds the JobPosting in the page's schema.org graph", () => {
    expect(jobPostingIn(PAGE)).toMatchObject({ '@type': 'JobPosting', datePosted: '2026-09-24' })
    expect(jobPostingIn('<script type="application/ld+json">{broken</script>')).toBeNull()
  })
})
