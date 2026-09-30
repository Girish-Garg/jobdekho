import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { eightfold } from '@jobdekho/sources/providers/eightfold.js'
import { parseSite } from '@jobdekho/sources/providers/eightfold-site.js'
import { placesOf, fromSeconds } from '@jobdekho/sources/providers/eightfold-places.js'
import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'

// Trimmed from Qualcomm's PCSX site and HSBC's older v2 site on 2026-09-30,
// with the tenant, ids and text replaced: one search page and one position
// from each API.
const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))
const SEARCH = fixture('eightfold-pcsx-search.json')
const DETAIL = fixture('eightfold-pcsx-detail.json')
const V2_JOBS = fixture('eightfold-v2-jobs.json')
const V2_JOB = fixture('eightfold-v2-job.json')

const ORIGIN = 'https://careers.acme.com'
const noPause = async () => {}
const [modem, intern, sales] = SEARCH.data.positions

// Each position gets a detail built from the captured one.
const pcsxDetail = (p) => ({ ...DETAIL, data: { ...DETAIL.data, id: p.id, name: p.name, locations: p.locations, standardizedLocations: p.standardizedLocations } })
const v2Detail = (p) => ({ ...V2_JOB, id: p.id, name: p.name, locations: p.locations })

// Routes the way the two APIs do. `api` is the one the tenant speaks; the
// other answers 403, as a real site does. Every request is recorded.
function fakeEightfold({ api = 'pcsx', search = () => SEARCH, jobs = () => V2_JOBS, detail, fail = () => null } = {}) {
  const calls = []
  const http = async (url) => {
    calls.push(url)
    const failure = fail(url, calls.length)
    if (failure) throw new Error(failure)
    const u = new URL(url)
    const start = Number(u.searchParams.get('start'))
    const isPcsx = u.pathname.startsWith('/api/pcsx/')
    if (isPcsx !== (api === 'pcsx')) throw new Error(`HTTP 403 for ${url}`)
    if (u.pathname === '/api/pcsx/search') return { json: async () => search(start) }
    if (u.pathname === '/api/apply/v2/jobs') return { json: async () => jobs(start) }
    const id = u.searchParams.get('position_id') || u.pathname.split('/').pop()
    const found = (detail || (isPcsx ? pcsxById : v2ById))(id)
    if (!found) throw new Error(`HTTP 404 for ${url}`)
    return { json: async () => found }
  }
  return { http, calls }
}
const pcsxById = (id) => {
  const p = SEARCH.data.positions.find((x) => String(x.id) === id)
  return p && pcsxDetail(p)
}
const v2ById = (id) => {
  const p = V2_JOBS.positions.find((x) => String(x.id) === id)
  return p && v2Detail(p)
}

const entry = { url: `${ORIGIN}/careers?location=India`, domain: 'acme.com', company: 'Acme' }
const run = (fake, context, extra = {}) => eightfold({ ...entry, ...extra }, { pause: noPause }).fetch(fake.http, context)

describe('eightfold site', () => {
  it('keeps the origin and the domain the API is asked with', () => {
    expect(parseSite('https://careers.acme.com/careers/job/1?domain=x', 'Acme.com')).toEqual({
      origin: 'https://careers.acme.com', domain: 'acme.com', query: 'domain=acme.com',
    })
  })

  it('returns null without a URL or a domain', () => {
    expect(parseSite('not a url', 'acme.com')).toBeNull()
    expect(parseSite('https://acme.eightfold.ai/careers', '')).toBeNull()
    expect(parseSite('https://acme.eightfold.ai/careers', 'acme')).toBeNull()
  })

  it('names itself by the domain, or by an explicit slug', () => {
    expect(eightfold(entry).name).toBe('eightfold:acme')
    expect(eightfold({ ...entry, slug: 'acme-campus' }).name).toBe('eightfold:acme-campus')
  })

  // buildAdapters runs before any fetch; a bad entry must not throw there.
  it('builds from an entry with no domain and fails only when fetched', async () => {
    const a = eightfold({ url: 'https://acme.eightfold.ai/careers', slug: 'acme' })
    expect(a.name).toBe('eightfold:acme')
    await expect(a.fetch(async () => ({}))).rejects.toThrow('domain')
  })
})

describe('eightfold places', () => {
  it('prefers the standard form and spells out India', () => {
    expect(placesOf(['Bengaluru, KA, IN', 'San Diego, CA, US'], ['Bangalore BTP'])).toEqual(['Bengaluru, KA, India', 'San Diego, CA, US'])
  })

  it('falls back to the typed places, each once', () => {
    expect(placesOf([], ['Hyderabad', 'hyderabad', '', 'Pune'])).toEqual(['Hyderabad', 'Pune'])
    expect(placesOf(undefined, undefined)).toEqual([])
  })

  it('reads epoch seconds', () => {
    expect(fromSeconds(1790726400)).toBe('2026-09-30T00:00:00.000Z')
    expect(fromSeconds(null)).toBeNull()
    expect(fromSeconds(0)).toBeNull()
  })
})

describe('eightfold PCSX sites', () => {
  it('asks for India, newest first, with the tenant domain', async () => {
    const fake = fakeEightfold()
    await run(fake)
    const first = new URL(fake.calls[0])
    expect(first.origin + first.pathname).toBe(`${ORIGIN}/api/pcsx/search`)
    expect(Object.fromEntries(first.searchParams)).toEqual({ domain: 'acme.com', query: '', location: 'India', start: '0', sort_by: 'timestamp' })
  })

  it('maps a position and its detail to RawPosting', async () => {
    const [r] = await run(fakeEightfold())
    expect(r.externalId).toBe('446710000001')
    expect(r.title).toBe('Software Engineer - Modem Firmware')
    expect(r.company).toBe('Acme')
    expect(r.location).toBe('Bengaluru, KA, India / Hyderabad, TS, India')
    expect(r.url).toBe('https://careers.acme.com/careers/job/446710000001')
    expect(r.tags).toEqual(['Software Engineering', 'hybrid'])
    expect(r.postedAt).toBe('2026-09-30T00:00:00.000Z')
  })

  it('carries the body as plain text, degree requirement included', async () => {
    const [r] = await run(fakeEightfold())
    expect(r.description).toContain("Bachelor's degree in Engineering, Computer Science")
    expect(r.description).toContain('C, C++ & Python')
    expect(r.description).not.toMatch(/<[a-z/]|&bull;|&#39;/)
  })

  it('dates by creationTs only when postedTs is missing', async () => {
    const out = await run(fakeEightfold())
    expect(out[1].postedAt).toBe('2026-09-29T00:00:00.000Z')
    expect(out[2].postedAt).toBe('2026-04-17T00:00:00.000Z')
  })

  it('sets level only from an employment type the tenant states', async () => {
    const internDetail = (id) => {
      const d = pcsxById(id)
      return id === String(intern.id) ? { ...d, data: { ...d.data, efcustomTextEmploymentType: ['Internship'] } } : d
    }
    const out = await run(fakeEightfold({ detail: internDetail }))
    expect(out.map((r) => r.level)).toEqual([undefined, 'internship', undefined])
    for (const r of out) expect(r.type).toBeUndefined()
  })

  it('builds the public URL from the listed path when the detail gives none', async () => {
    const bare = (id) => {
      const d = pcsxById(id)
      return { ...d, data: { ...d.data, publicUrl: undefined } }
    }
    const [r] = await run(fakeEightfold({ detail: bare }))
    expect(r.url).toBe(`${ORIGIN}/careers/job/446710000001`)
  })
})

describe('eightfold v2 sites', () => {
  it('falls back to the older API when PCSX answers 403', async () => {
    const fake = fakeEightfold({ api: 'v2' })
    const out = await run(fake)
    expect(fake.calls[0]).toContain('/api/pcsx/search')
    const list = new URL(fake.calls[1])
    expect(list.pathname).toBe('/api/apply/v2/jobs')
    expect(Object.fromEntries(list.searchParams)).toMatchObject({ domain: 'acme.com', location: 'India', start: '0', sort_by: 'timestamp' })
    expect(fake.calls[2]).toBe(`${ORIGIN}/api/apply/v2/jobs/563770000001?domain=acme.com`)
    expect(out.map((r) => r.externalId)).toEqual(['563770000001', '563770000002'])
  })

  it('maps a v2 position and its detail, dated by t_create', async () => {
    const [r] = await run(fakeEightfold({ api: 'v2' }))
    expect(r.title).toBe('Full Stack Tester / Consultant Specialist')
    expect(r.location).toBe('Pune, Maharashtra, India / Pune, MH, In')
    expect(r.url).toBe('https://acme.eightfold.ai/careers/job/563770000001')
    expect(r.description).toContain('B.E. in Computer Science & 3+ years of Selenium.')
    expect(r.postedAt).toBe(fromSeconds(1790760992))
    expect(r.tags).toEqual(['Technology', 'hybrid'])
  })

  it('throws what the older API said when neither answers', async () => {
    const fake = fakeEightfold({ api: 'v2', fail: (url) => (url.includes('/api/apply/') ? `HTTP 500 for ${url}` : null) })
    await expect(run(fake)).rejects.toThrow('HTTP 500')
  })

  it('does not try the older API when PCSX fails for another reason', async () => {
    const fake = fakeEightfold({ fail: (url) => (url.includes('/search') ? `HTTP 502 for ${url}` : null) })
    await expect(run(fake)).rejects.toThrow('HTTP 502')
    expect(fake.calls).toHaveLength(1)
  })
})

// Ten positions a page, whatever is asked for.
const tenAt = (start, count) => ({
  status: 200,
  data: { count, positions: Array.from({ length: Math.max(0, Math.min(10, count - start)) }, (_, i) => ({ ...modem, id: start + i + 1 })) },
})
const anyDetail = (id) => ({ ...DETAIL, data: { ...DETAIL.data, id: Number(id) } })

describe('eightfold paging', () => {
  it('pages by ten up to the count', async () => {
    const fake = fakeEightfold({ search: (start) => tenAt(start, 25), detail: anyDetail })
    const out = await run(fake)
    const starts = fake.calls.filter((u) => u.includes('/search')).map((u) => new URL(u).searchParams.get('start'))
    expect(starts).toEqual(['0', '10', '20'])
    expect(out).toHaveLength(25)
  })

  it('lists 100 postings and describes at most 40 however many the site has', async () => {
    const fake = fakeEightfold({ search: (start) => tenAt(start, 616), detail: anyDetail })
    const out = await run(fake)
    expect(fake.calls.filter((u) => u.includes('/search'))).toHaveLength(10)
    expect(fake.calls.filter((u) => u.includes('position_details'))).toHaveLength(40)
    expect(out).toHaveLength(40)
    expect(out[0].externalId).toBe('1')
  })

  it('counts a position once when it shows up on two pages', async () => {
    const overlap = (start) => tenAt(start === 10 ? 5 : start, 20)
    const out = await run(fakeEightfold({ search: overlap, detail: anyDetail }))
    expect(out.map((r) => r.externalId)).toEqual(Array.from({ length: 15 }, (_, i) => String(i + 1)))
  })

  it('skips a failed later page and reads the rest', async () => {
    const fake = fakeEightfold({
      search: (start) => tenAt(start, 30), detail: anyDetail,
      fail: (url) => (url.includes('start=10&') ? `HTTP 502 for ${url}` : null),
    })
    expect(await run(fake)).toHaveLength(20)
  })

  it('pauses before every request after the first', async () => {
    let pauses = 0
    const fake = fakeEightfold()
    await eightfold(entry, { pause: async () => { pauses++ } }).fetch(fake.http)
    expect(pauses).toBe(fake.calls.length - 1)
  })

  it('returns an empty list for an empty board', async () => {
    const fake = fakeEightfold({ search: () => ({ status: 200, data: { count: 0, positions: [] } }) })
    expect(await run(fake)).toEqual([])
    expect(fake.calls).toHaveLength(1)
  })
})

describe('eightfold failures', () => {
  it('leaves out only the posting whose detail failed', async () => {
    const fake = fakeEightfold({ fail: (url) => (url.includes(`position_id=${intern.id}`) ? 'timeout' : null) })
    expect((await run(fake)).map((r) => r.title)).toEqual([modem.name, sales.name])
  })

  it('sends nothing more once the host answers 429, keeps what it read, and says so', async () => {
    const fake = fakeEightfold({ fail: (url) => (url.includes(`position_id=${intern.id}`) ? `HTTP 429 for ${url}` : null) })
    const adapter = eightfold(entry, { pause: noPause })
    const out = await adapter.fetch(fake.http)
    expect(out.map((r) => r.title)).toEqual([modem.name])
    expect(fake.calls.at(-1)).toContain(`position_id=${intern.id}`)
    expect(adapter.note).toContain('429')
  })

  it('stops listing on a 429 and still describes what it listed', async () => {
    const fake = fakeEightfold({
      search: (start) => tenAt(start, 30), detail: anyDetail,
      fail: (url) => (url.includes('start=10&') ? `HTTP 429 for ${url}` : null),
    })
    const adapter = eightfold(entry, { pause: noPause })
    expect(await adapter.fetch(fake.http)).toHaveLength(10)
    expect(fake.calls.some((u) => u.includes('start=20'))).toBe(false)
    expect(adapter.note).toContain('429')
  })

  it('reports a source whose every detail call fails', async () => {
    await expect(run(fakeEightfold({ detail: () => null }))).rejects.toThrow('no detail could be read')
  })

  // A renamed body field must not turn into postings stored without one.
  it('counts a position with no body as unread', async () => {
    const renamed = (id) => {
      const d = pcsxById(id)
      return { ...d, data: { ...d.data, jobDescription: undefined, jobDescriptionHtml: d.data.jobDescription } }
    }
    await expect(run(fakeEightfold({ detail: renamed }))).rejects.toThrow('no detail could be read')
  })

  it('throws when the first page fails, so the run records why', async () => {
    const fake = fakeEightfold({ fail: (url) => (url.includes('/search') ? 'HTTP 500' : null) })
    await expect(run(fake)).rejects.toThrow('HTTP 500')
  })
})

describe('eightfold with the run context', () => {
  const details = (fake) => fake.calls.filter((u) => u.includes('position_details')).map((u) => new URL(u).searchParams.get('position_id'))

  it('asks for no detail of a posting the store already describes, and leaves it out', async () => {
    const fake = fakeEightfold()
    const seen = []
    const known = (source, id) => { seen.push([source, id]); return id === String(intern.id) }
    const out = await run(fake, { known })
    expect(seen[0]).toEqual(['eightfold:acme', String(modem.id)])
    expect(details(fake)).toEqual([String(modem.id), String(sales.id)])
    expect(out.map((r) => r.title)).toEqual([modem.name, sales.name])
  })

  it('shows the filter the listed row with its real location', async () => {
    const raws = []
    await run(fakeEightfold(), { wanted: (source, raw) => { raws.push(raw); return true } })
    expect(raws[0]).toEqual({ externalId: String(modem.id), title: modem.name, company: 'Acme', location: 'Bengaluru, KA, India / Hyderabad, TS, India' })
  })

  it('reports nothing wrong when every listed posting is already known', async () => {
    const fake = fakeEightfold()
    expect(await run(fake, { known: () => true })).toEqual([])
    expect(details(fake)).toEqual([])
  })
})

// The same wanted() scrape.js builds, over the real relevance floor.
describe('eightfold listed rows against config/filters.json', () => {
  const rules = JSON.parse(readFileSync(new URL('../../../config/filters.json', import.meta.url), 'utf8'))
  const wanted = (source, raw) => filter(normalize(raw, source), rules)

  it('keeps engineering roles in India and drops a sales one and one abroad', async () => {
    const abroad = { ...modem, id: 446710000009, name: 'Software Engineer', standardizedLocations: ['San Diego, CA, US'], locations: ['San Diego'] }
    const search = () => ({ ...SEARCH, data: { ...SEARCH.data, count: 4, positions: [...SEARCH.data.positions, abroad] } })
    const fake = fakeEightfold({ search, detail: anyDetail })
    await run(fake, { wanted })
    const asked = fake.calls.filter((u) => u.includes('position_details')).map((u) => new URL(u).searchParams.get('position_id'))
    expect(asked).toEqual([String(modem.id), String(intern.id)])
  })
})
