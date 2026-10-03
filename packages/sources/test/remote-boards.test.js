import { describe, it, expect } from 'vitest'
import { remotive, toRaw as remotiveRaw } from '@jobdekho/sources/boards/remotive.js'
import { remoteok, parseRemoteOk } from '@jobdekho/sources/boards/remoteok.js'
import { arbeitnow, toRaw as arbeitnowRaw } from '@jobdekho/sources/boards/arbeitnow.js'

describe('remotive adapter', () => {
  const fixture = {
    jobs: [{
      id: 2001, title: 'Senior Backend Engineer', company_name: 'Acme Remote',
      candidate_required_location: 'Worldwide', url: 'https://remotive.com/j/2001',
      description: '<p>Build &amp; ship</p>', tags: ['python'], job_type: 'full_time',
      publication_date: '2026-08-14T09:00:00', salary: '$90k - $120k',
    }],
  }
  const http = async () => ({ json: async () => fixture })

  it('maps a job and keeps the reachability signal in location', async () => {
    const raws = await remotive().fetch(http)
    expect(raws[0]).toMatchObject({
      externalId: '2001', title: 'Senior Backend Engineer',
      company: 'Acme Remote', location: 'Worldwide', stipend: '$90k - $120k',
    })
    expect(raws[0].description.trim()).toBe('Build & ship')
  })

  it('reads one page per category', async () => {
    expect(await remotive().fetch(http)).toHaveLength(3)
  })

  it('marks an internship from the job type', () => {
    expect(remotiveRaw({ id: 1, job_type: 'internship' }).level).toBe('internship')
    expect(remotiveRaw({ id: 1, job_type: 'full_time' }).level).toBeUndefined()
    expect(remotiveRaw({ id: 1, job_type: 'full_time' }).type).toBe('job')
  })

  // A remote-only board: its location says where a person may work from,
  // not whether the job is remote.
  it('marks every listing remote', () => {
    expect(remotiveRaw({ id: 1, candidate_required_location: 'USA Only' }).workMode).toBe('remote')
  })
})

describe('remoteok adapter', () => {
  // The API puts a legal notice first. It has no id, which is what marks it.
  const payload = [
    { legal: 'By using this data you agree to the terms' },
    {
      id: '1136812', position: 'Platform Engineer', company: 'Menzies',
      location: 'Worldwide', apply_url: 'https://remoteOK.com/l/1136812',
      description: '<strong>Overview</strong> build things', tags: ['devops'],
      date: '2026-08-15T16:07:53+00:00', salary_min: 70000, salary_max: 110000,
    },
  ]

  it('drops the legal notice and keeps real jobs', () => {
    const raws = parseRemoteOk(payload)
    expect(raws).toHaveLength(1)
    expect(raws[0].title).toBe('Platform Engineer')
  })

  it('formats a salary range', () => {
    expect(parseRemoteOk(payload)[0].stipend).toBe('$70k - $110k /year')
  })

  // Amounts this small are placeholders; rounded they read "$0k - $0k".
  it('states no pay for a placeholder salary', () => {
    const placeholder = [{ ...payload[1], salary_min: 1, salary_max: 400 }]
    expect(parseRemoteOk(placeholder)[0].stipend).toBeNull()
    expect(parseRemoteOk([{ ...payload[1], salary_min: 0, salary_max: 90000 }])[0].stipend).toBe('$90k /year')
  })

  it('marks every listing remote', () => {
    expect(parseRemoteOk(payload)[0].workMode).toBe('remote')
  })

  it('tolerates a non-array payload', () => {
    expect(parseRemoteOk(null)).toEqual([])
  })

  it('fetches through the adapter', async () => {
    const http = async () => ({ json: async () => payload })
    expect(await remoteok().fetch(http)).toHaveLength(1)
  })
})

describe('arbeitnow adapter', () => {
  const fixture = {
    data: [{
      slug: 'backend-engineer-berlin-21832', company_name: 'Focused',
      title: 'Backend Engineer', description: '<h2>About</h2><p>Work</p>',
      remote: true, url: 'https://www.arbeitnow.com/jobs/x', tags: ['Engineering'],
      job_types: ['Full Time'], location: 'Berlin, DE', created_at: 1786902019,
    }],
  }

  it('maps a job and leaves the location untouched', async () => {
    const [raw] = await arbeitnow().fetch(async () => ({ json: async () => fixture }))
    expect(raw.externalId).toBe('backend-engineer-berlin-21832')
    expect(raw.company).toBe('Focused')
    // Not rewritten to "Remote": that would smuggle a Berlin role past the
    // location rule even though it is not reachable from India.
    expect(raw.location).toBe('Berlin, DE')
    expect(raw.tags).toEqual(['Engineering', 'Full Time'])
  })

  it('converts the epoch timestamp', () => {
    expect(arbeitnowRaw({ slug: 'a', created_at: 1786902019 }).postedAt).toContain('2026')
  })

  // Seen live: one row in 175 carried job_types as an object rather than a
  // list, because PHP serialises an array with non-sequential keys that way.
  // Spreading it threw, and the whole board was lost to the one bad row.
  it('reads a list that arrived as a keyed object', () => {
    const raw = arbeitnowRaw({
      slug: 'a', tags: { 2: 'Finance' }, job_types: { 1: 'professional / experienced' },
    })
    expect(raw.tags).toEqual(['Finance', 'professional / experienced'])
  })

  it('still reads an internship out of a keyed job_types object', () => {
    expect(arbeitnowRaw({ slug: 'a', job_types: { 3: 'internship' } }).level).toBe('internship')
  })

  // One malformed row must not cost the other 174.
  it('maps a whole board when one row carries the keyed shape', async () => {
    const data = [
      { slug: 'a', title: 'Dev', job_types: ['full time'] },
      { slug: 'b', title: 'Ops', job_types: { 1: 'professional / experienced' } },
      { slug: 'c', title: 'QA', tags: { 4: 'Testing' } },
    ]
    const rows = await arbeitnow().fetch(async () => ({ json: async () => ({ data }) }))
    expect(rows.map((r) => r.externalId)).toEqual(['a', 'b', 'c'])
  })
})
