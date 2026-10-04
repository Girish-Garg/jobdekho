import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { kpit } from '@jobdekho/sources/companies/kpit.js'
import { parseListing, LIST_URL } from '@jobdekho/sources/companies/kpit-list.js'
import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'

// www.kpit.com/job-listing/?show_all=1 and one TalentOjo job record as they
// answered on 2026-10-04, trimmed: five of the listing's jobs (one in
// Sunnyvale, one in two Indian cities, one in four) with the filter panel's
// office map, and the record of the Coimbatore Trainee with its body cut
// short and its recruiters' names and contacts left out.
const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const LISTING = fixture('kpit-listing.html')
const RECORD = JSON.parse(fixture('kpit-job.json'))
const RULES = JSON.parse(readFileSync(new URL('../../../config/filters.json', import.meta.url), 'utf8'))
const noPause = async () => {}

// En and em dashes, by code point: the body's &ndash; and &mdash; must not
// come back as them.
const DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`)

const JOB_API = 'https://talentojo.kpit.com/service/jobs/'
const ROWS = parseListing(LISTING)

// Each listed job gets the captured record, under its own id, title and
// cities, unless `record` says otherwise.
const recordFor = (id) => {
  const row = ROWS.find((r) => r.id === id)
  return id === '82118' ? RECORD : { ...RECORD, job: { ...RECORD.job, id, title: row?.title, location: row?.places } }
}

function fakeKpit({ listing = () => LISTING, record = recordFor, fail = () => null } = {}) {
  const calls = []
  const http = async (url, opts = {}) => {
    calls.push({ url, accept: opts.headers?.Accept })
    const failure = fail(url)
    if (failure) throw new Error(failure)
    return url.startsWith(JOB_API) ? { json: async () => record(url.slice(JOB_API.length)) } : { text: async () => listing(url) }
  }
  return { http, calls }
}

const run = (fake, context) => kpit({ pause: noPause }).fetch(fake.http, context)

describe('kpit listing', () => {
  it("keeps the jobs with an office in India by the site's own office map, two-city ones included", () => {
    expect(ROWS.map((r) => r.id)).toEqual(['84264', '82264', '82118', '49197'])
    expect(ROWS[1]).toEqual({ id: '82264', title: 'Lead (Android Automotive MW/HAL/AOSP)', places: ['Bangalore', 'Pune'], experience: '4-15 years' })
    expect(ROWS[3].places).toEqual(['Bangalore', 'Chennai', 'Cochin (Kochi)', 'Pune'])
  })

  // A page that has lost the office map is not the listing this parser
  // knows, and must fail the source rather than read as a quiet board.
  it('throws a page without the office map', () => {
    expect(() => parseListing('<html><body><div class="job-div"><h3>Engineer</h3></div></body></html>')).toThrow('offices are in India')
    expect(parseListing('<script>var locationMap = {"India":["Pune"]};</script>')).toEqual([])
  })
})

describe('kpit adapter', () => {
  it("reads the site's own show-all listing as a page, once", async () => {
    const fake = fakeKpit()
    await run(fake)
    expect(fake.calls[0]).toEqual({ url: LIST_URL, accept: 'text/html' })
    expect(LIST_URL).toBe('https://www.kpit.com/job-listing/?show_all=1')
    expect(fake.calls.filter((c) => c.url === LIST_URL)).toHaveLength(1)
  })

  it("maps a job and its TalentOjo record to RawPosting", async () => {
    const out = await run(fakeKpit())
    const r = out.find((p) => p.externalId === '82118')
    expect(r.title).toBe('Trainee')
    expect(r.company).toBe('KPIT')
    expect(r.location).toBe('Coimbatore, India')
    expect(r.url).toBe('https://talentojo.kpit.com/tojo/app/job-apply/#/Career%20Portal/82118')
    expect(r.postedAt).toBe('2026-06-11T00:00:00.000Z')
    expect(r.experience).toBe('0 - 0 years')
    expect(r.tags).toEqual(['Engineer'])
    expect(r.level).toBeUndefined()
  })

  it('folds the body, skills and degree into plain text, and keeps nothing of the recruiters', async () => {
    const [r] = (await run(fakeKpit())).filter((p) => p.externalId === '82118')
    expect(r.description.startsWith('Roles Included')).toBe(true)
    expect(r.description).toContain('Qualification: 2025/2026 graduates with B.E./B.Tech in Mechanical')
    expect(r.description).toContain('Skills\n\nMechanical, Product / Domain Knowledge, Customer Relationship Management')
    expect(r.description).toContain('Qualification\n\nB.Tech/B.E in Mechanical')
    expect(r.description).not.toMatch(/<|&nbsp;|mso-/)
    expect(r.description).not.toMatch(DASHES)
    expect(JSON.stringify(r)).not.toMatch(/recruiter|@kpit\.com/i)
  })

  it("names each Indian city a job is in, from the record", async () => {
    const out = await run(fakeKpit())
    expect(out.find((p) => p.externalId === '82264').location).toBe('Bangalore, India / Pune, India')
  })

  it('asks for the record of a new job the filter would keep, and of nothing else', async () => {
    const fake = fakeKpit()
    const context = { known: (name, id) => name === 'kpit' && id === '84264', wanted: (name, raw) => !raw.title.startsWith('Autosar') }
    const out = await run(fake, context)
    expect(out.map((r) => r.externalId)).toEqual(['82264', '82118'])
    expect(fake.calls.map((c) => c.url)).toEqual([LIST_URL, `${JOB_API}82264`, `${JOB_API}82118`])
  })

  it('leaves out a record no longer Published, or for a job outside India', async () => {
    const record = (id) => {
      if (id === '82264') return { job: { ...recordFor(id).job, status: 'Closed' } }
      if (id === '82118') return { job: { ...RECORD.job, country: 'Vietnam' } }
      return recordFor(id)
    }
    const out = await run(fakeKpit({ record }))
    expect(out.map((r) => r.externalId)).toEqual(['84264', '49197'])
  })

  // Most listed jobs were opened months ago and are never stored, so each
  // record's date is remembered and handed to the run's filter next time.
  it("remembers each record's date for the jobs still listed, and hands it to the filter", async () => {
    const kept = {}
    const first = { keep: (name, key, value) => { kept[key] = value } }
    await run(fakeKpit(), first)
    expect(kept.created).toEqual({
      84264: '2026-06-11T00:00:00.000Z', 82264: '2026-06-11T00:00:00.000Z', 82118: '2026-06-11T00:00:00.000Z', 49197: '2026-06-11T00:00:00.000Z',
    })
    const asked = []
    const later = {
      recall: (name, key) => (key === 'created' ? { 82118: '2026-06-11T00:00:00.000Z', 99999: '2025-01-01T00:00:00.000Z' } : null),
      wanted: (name, raw) => (asked.push([raw.externalId, raw.postedAt]), false),
      keep: (name, key, value) => { kept[key] = value },
    }
    await run(fakeKpit(), later)
    expect(asked).toContainEqual(['82118', '2026-06-11T00:00:00.000Z'])
    expect(asked).toContainEqual(['84264', null])
    expect(kept.created).toEqual({ 82118: '2026-06-11T00:00:00.000Z' })
  })

  it('stops for the run when the listing answers 429', async () => {
    const adapter = kpit({ pause: noPause })
    const fake = fakeKpit({ fail: () => `HTTP 429 for ${LIST_URL}` })
    await expect(adapter.fetch(fake.http)).rejects.toThrow('kpit stopped')
    await expect(adapter.fetch(fake.http)).rejects.toThrow('kpit stopped')
    expect(fake.calls).toHaveLength(1)
  })

  it('passes core normalize: the Trainee reads as entry, and a software role passes the default filters', async () => {
    const out = await run(fakeKpit())
    const trainee = normalize(out.find((r) => r.externalId === '82118'), 'kpit')
    expect(trainee.level).toBe('entry')
    expect(trainee.levelTag.evidence).toBe('Title says Trainee')
    expect(trainee.degreeMin).toBe('bachelors')
    expect(trainee.experienceYears).toBe(0)
    const architect = normalize(out.find((r) => r.externalId === '84264'), 'kpit')
    expect(filter(architect, RULES)).toBe(true)
  })
})
