import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { apple } from '@jobdekho/sources/companies/apple.js'
import { parseSearch, parseDetail } from '@jobdekho/sources/companies/apple-page.js'
import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'

// jobs.apple.com's search page and one posting's page as the site served
// them on 2026-09-30, trimmed to their hydration data (a JSON document in a
// JS string literal) with two results, ids and text replaced.
const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const SEARCH = fixture('apple-search.html')
const DETAIL = fixture('apple-detail.html')
const RULES = JSON.parse(readFileSync(new URL('../../../config/filters.json', import.meta.url), 'utf8'))
const noPause = async () => {}

function fakeApple({ search = () => SEARCH, detail = () => DETAIL, fail = () => null } = {}) {
  const urls = []
  const http = async (url) => {
    urls.push(url)
    const failure = fail(url)
    if (failure) throw new Error(failure)
    return { text: async () => (new URL(url).pathname.endsWith('/search') ? search(url) : detail(url)) }
  }
  return { http, urls }
}

const run = (fake, context) => apple({ pause: noPause }).fetch(fake.http, context)

describe('apple pages', () => {
  it('reads the results out of the hydration data', () => {
    const rows = parseSearch(SEARCH)
    expect(rows.map((r) => r.id)).toEqual(['200600001-1052', 'PIPE-200300002'])
    expect(parseDetail(DETAIL).minimumQualifications).toContain("Bachelor's degree")
  })

  it('fails loudly on a page without search data', () => {
    expect(() => parseSearch('<html><body>maintenance</body></html>')).toThrow('no search results')
    expect(parseDetail('<html></html>')).toBeNull()
  })
})

describe('apple adapter', () => {
  it("narrows to India with the site's location filter, newest first", async () => {
    const fake = fakeApple()
    await run(fake)
    const url = new URL(fake.urls[0])
    expect(url.pathname).toBe('/en-in/search')
    expect(url.searchParams.get('location')).toBe('india-INDC')
    expect(url.searchParams.get('sort')).toBe('newest')
    expect(url.searchParams.get('page')).toBe('1')
  })

  it('maps a result and its page to RawPosting', async () => {
    const [r] = await run(fakeApple())
    expect(r.externalId).toBe('200600001-1052')
    expect(r.title).toBe('Site Reliability Engineer')
    expect(r.company).toBe('Apple')
    expect(r.location).toBe('Hyderabad, India')
    expect(r.url).toBe('https://jobs.apple.com/en-in/details/200600001-1052/site-reliability-engineer?team=SFTWR')
    expect(r.tags).toEqual(['Software and Services'])
    expect(r.postedAt).toBe('2026-09-29T22:46:00.419Z')
    expect(r.level).toBeUndefined()
  })

  it('folds the summary, duties and qualifications into a plain-text body', async () => {
    const [r] = await run(fakeApple())
    expect(r.description).toContain('Join the platform team that keeps services running.')
    expect(r.description).toContain('Responsibilities\n\nFind performance bottlenecks.')
    expect(r.description).toContain("Minimum qualifications\n\nBachelor's degree in Computer Science.")
    expect(r.description).toContain('Preferred qualifications\n\nExperience with Kubernetes.')
  })

  // The site's own links leave the retail pipeline prefix off.
  it('drops the PIPE- prefix from a standing role', async () => {
    const fake = fakeApple()
    const out = await run(fake)
    expect(out[1].externalId).toBe('200300002')
    expect(out[1].location).toBe('India')
    expect(fake.urls).toContain('https://jobs.apple.com/en-in/details/200300002/in-technical-specialist?team=APPST')
  })

  it('pages at 20 and stops at five pages', async () => {
    const data = JSON.parse(JSON.parse(SEARCH.match(/JSON\.parse\(("(?:[^"\\]|\\.)*")\)/)[1]))
    const many = Array.from({ length: 20 }, (_, i) => ({ ...data.loaderData.search.searchResults[0], id: `20060${i}-1052` }))
    data.loaderData.search.searchResults = many
    const page = SEARCH.replace(/JSON\.parse\("(?:[^"\\]|\\.)*"\)/, () => `JSON.parse(${JSON.stringify(JSON.stringify(data))})`)
    const fake = fakeApple({ search: () => page })
    await run(fake, { known: () => true })
    expect(fake.urls.map((u) => new URL(u).searchParams.get('page'))).toEqual(['1', '2', '3', '4', '5'])
  })

  it('skips a posting the store has or the filter drops, before its page is read', async () => {
    const fake = fakeApple()
    const context = { known: (name, id) => name === 'apple' && id === '200300002', wanted: () => true }
    const out = await run(fake, context)
    expect(out.map((r) => r.externalId)).toEqual(['200600001-1052'])
    expect(fake.urls).toHaveLength(2)
  })

  it('passes core normalize and the default filters', async () => {
    const [r] = await run(fakeApple())
    const p = normalize(r, 'apple')
    expect(p.degreeMin).toBe('bachelors')
    expect(filter(p, RULES)).toBe(true)
  })

  it('stops for the run when the search answers 429', async () => {
    const adapter = apple({ pause: noPause })
    const fake = fakeApple({ fail: () => 'HTTP 429 for https://jobs.apple.com/en-in/search' })
    await expect(adapter.fetch(fake.http)).rejects.toThrow('apple stopped')
    await expect(adapter.fetch(fake.http)).rejects.toThrow('apple stopped')
    expect(fake.urls).toHaveLength(1)
  })
})
