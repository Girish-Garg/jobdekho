import { describe, it, expect } from 'vitest'
import { amazon } from '@jobdekho/sources/companies/amazon.js'

// Field names and formats as amazon.jobs/en/search.json returned them on
// 2026-09-30, with the text replaced.
const job = (id, extra = {}) => ({
  id_icims: String(id),
  title: 'Software Development Engineer I',
  company_name: 'Amazon Development Centre (India) Private Limited',
  country_code: 'IND',
  location: 'IN, KA, Bengaluru',
  normalized_location: 'Bengaluru, Karnataka, IND',
  job_path: `/en/jobs/${id}/software-development-engineer-i`,
  job_category: 'Software Development',
  posted_date: 'September 30, 2026',
  description: 'Build the checkout service.<br/><br/>Own it end to end.',
  basic_qualifications: '- Bachelor&#39;s degree in computer science<br/>- 1+ years of Java',
  preferred_qualifications: '- Experience with AWS',
  ...extra,
})

const page = (jobs) => ({ hits: jobs.length, jobs })
const noPause = async () => {}

function fakeAmazon(pages, { fail } = {}) {
  const urls = []
  const http = async (url) => {
    urls.push(url)
    const i = urls.length - 1
    if (fail?.(i)) throw new Error('HTTP 503')
    return { json: async () => pages[i] || page([]) }
  }
  return { http, urls }
}

describe('amazon adapter', () => {
  it('narrows to India with the country filter, not loc_query', async () => {
    const fake = fakeAmazon([page([job(1)])])
    await amazon({ pause: noPause }).fetch(fake.http)
    expect(fake.urls[0]).toContain('normalized_country_code%5B%5D=IND')
    expect(fake.urls[0]).not.toContain('loc_query')
    expect(fake.urls[0]).toContain('sort=recent')
  })

  it('maps a job to RawPosting', async () => {
    const [r] = await amazon({ pause: noPause }).fetch(fakeAmazon([page([job(10565380)])]).http)
    expect(r.externalId).toBe('10565380')
    expect(r.company).toBe('Amazon')
    expect(r.url).toBe('https://www.amazon.jobs/en/jobs/10565380/software-development-engineer-i')
    expect(r.tags).toEqual(['Software Development'])
    expect(r.postedAt).toBe('2026-09-30T00:00:00.000Z')
    expect(r.type).toBeUndefined()
    expect(r.level).toBeUndefined()
  })

  // core's location rule knows "India", not the ISO code.
  it('spells the country out', async () => {
    const [r] = await amazon({ pause: noPause }).fetch(fakeAmazon([page([job(1)])]).http)
    expect(r.location).toBe('Bengaluru, Karnataka, India')
  })

  it('folds the qualifications into a plain-text body', async () => {
    const [r] = await amazon({ pause: noPause }).fetch(fakeAmazon([page([job(1)])]).http)
    expect(r.description).toContain('Build the checkout service.')
    expect(r.description).toContain("Basic qualifications\n\n- Bachelor's degree in computer science")
    expect(r.description).toContain('Preferred qualifications\n\n- Experience with AWS')
    expect(r.description).not.toMatch(/<br|&#39;/)
  })

  it('pages until a short page', async () => {
    const full = (start) => page(Array.from({ length: 100 }, (_, i) => job(start + i)))
    const fake = fakeAmazon([full(0), full(100), page([job(200)])])
    const out = await amazon({ pause: noPause }).fetch(fake.http)
    expect(out).toHaveLength(201)
    expect(fake.urls.map((u) => new URL(u).searchParams.get('offset'))).toEqual(['0', '100', '200'])
  })

  it('reads at most five pages', async () => {
    const full = page(Array.from({ length: 100 }, (_, i) => job(i)))
    const fake = fakeAmazon(Array(9).fill(full))
    await amazon({ pause: noPause }).fetch(fake.http)
    expect(fake.urls).toHaveLength(5)
  })

  it('throws when the first page fails and skips a later one', async () => {
    await expect(amazon({ pause: noPause }).fetch(fakeAmazon([], { fail: (i) => i === 0 }).http)).rejects.toThrow('HTTP 503')
    const full = (start) => page(Array.from({ length: 100 }, (_, i) => job(start + i)))
    const fake = fakeAmazon([full(0), null, page([job(500)])], { fail: (i) => i === 1 })
    expect(await amazon({ pause: noPause }).fetch(fake.http)).toHaveLength(101)
  })

  it('returns an empty list for an empty payload', async () => {
    const http = async () => ({ json: async () => ({}) })
    expect(await amazon({ pause: noPause }).fetch(http)).toEqual([])
  })
})
