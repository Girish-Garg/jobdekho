import { describe, it, expect } from 'vitest'
import { instahyre, toRaw } from '@jobdekho/sources/boards/instahyre.js'

// One object from a live /api/v1/job_search response, trimmed. The company
// sits under employer.company_name; there is no description and no date.
const fixture = {
  meta: { offset: 0, limit: 35, total_count: 13605, next: '/api/v1/job_search?job_type=1&limit=35&offset=35' },
  objects: [{
    resource_uri: '/api/v1/job_search/441499',
    employer: {
      resource_uri: '/api/v1/candidate_opportunity_employer/51244',
      id: 51244,
      company_name: 'Soulside AI',
      company_tagline: 'Building the future of behavioral health',
      company_founded: 2023,
      employee_count: 1,
      instahyre_note: 'Soulside is a mental health platform.',
    },
    interview_status: null,
    reviewed_at: null,
    public_url: 'https://www.instahyre.com/job-441499-frontend-engineer-at-soulside-ai-work-from-home/',
    is_strong_match: null,
    score: null,
    candidate_title: 'Frontend Engineer',
    id: 441499,
    title: 'Frontend Engineer',
    locations: 'Work From Home',
    keywords: ['CSS', 'Data Structures', 'JavaScript', 'React.js'],
    accept_outstation: true,
    gender: 0,
  }],
}

describe('instahyre toRaw', () => {
  it('maps an object, reading the company out of employer', () => {
    expect(toRaw(fixture.objects[0])).toEqual({
      externalId: '441499',
      title: 'Frontend Engineer',
      company: 'Soulside AI',
      location: 'Work From Home',
      url: 'https://www.instahyre.com/job-441499-frontend-engineer-at-soulside-ai-work-from-home/',
      description: '',
      tags: ['CSS', 'Data Structures', 'JavaScript', 'React.js'],
      postedAt: null,
      logoUrl: null,
      type: 'job',
      employment: 'full_time',
    })
  })

  it("keeps the employer's logo address", () => {
    const logo = 'https://media.instahyre.com/images/profile/base/employer/1/x.webp'
    expect(toRaw({ id: 1, employer: { company_name: 'A', profile_image_src: logo } }).logoUrl).toBe(logo)
  })

  it('keeps a multi-city location string as given', () => {
    expect(toRaw({ id: 1, locations: 'Bangalore,Gurgaon,Hyderabad' }).location).toBe('Bangalore,Gurgaon,Hyderabad')
  })

  // The object itself never says whether it is an internship; the slice it
  // was fetched under does.
  it('marks internships from the slice, not the object', () => {
    expect(toRaw(fixture.objects[0], 'internship').level).toBe('internship')
    expect(toRaw(fixture.objects[0], 'internship').type).toBeUndefined()
    expect(toRaw(fixture.objects[0], 'full_time').level).toBeUndefined()
    expect(toRaw(fixture.objects[0], 'full_time').type).toBe('job')
    expect(toRaw(fixture.objects[0]).level).toBeUndefined()
  })

  it('tolerates missing employer and keywords', () => {
    expect(toRaw({ id: 2, title: 'QA Engineer' })).toMatchObject({ company: '', tags: [] })
  })
})

describe('instahyre adapter', () => {
  const capture = () => {
    const urls = []
    const http = async (url) => {
      urls.push(url)
      return { json: async () => fixture }
    }
    return { urls, http }
  }

  it('sweeps three function groups across three slices, each until a short page', async () => {
    const { urls, http } = capture()
    const rows = await instahyre().fetch(http)
    expect(urls).toHaveLength(9)
    expect(urls.filter((u) => u.includes('job_type=2'))).toHaveLength(3)
    expect(urls.filter((u) => u.includes('experience_level=entry_level'))).toHaveLength(3)
    // The same job listed nine times comes back once.
    expect(rows).toHaveLength(1)
  })

  // A full page means there may be more: the small slices read on until a
  // short one, the general slice stops at two pages.
  it('reads the small slices to their end and the general slice two pages deep', async () => {
    const urls = []
    const page = (n) => Array.from({ length: n }, (_, i) => ({ id: `${urls.length}-${i}`, title: 'Dev' }))
    const http = async (url) => {
      urls.push(url)
      const offset = Number(url.match(/offset=(\d+)/)[1])
      return { json: async () => ({ objects: page(url.includes('job_type=2') || offset >= 70 ? 3 : 35) }) }
    }
    await instahyre().fetch(http)
    const entry = urls.filter((u) => u.includes('entry_level'))
    const general = urls.filter((u) => u.includes('job_type=1') && !u.includes('entry_level'))
    expect(entry.filter((u) => u.includes('offset=70'))).toHaveLength(3)
    expect(general.filter((u) => u.includes('offset=70'))).toHaveLength(0)
    expect(general).toHaveLength(6)
  })

  // Instahyre's own filing of the experience asked: a job in the entry level
  // slice is entry level, one in neither small slice is above it.
  it('labels a job by the slices it was found in', async () => {
    const http = async (url) => {
      const ids = url.includes('job_type=2') ? ['i'] : url.includes('entry_level') ? ['e'] : ['e', 'g']
      return { json: async () => ({ objects: ids.map((id) => ({ id, title: 'SDE 1' })) }) }
    }
    const rows = Object.fromEntries((await instahyre().fetch(http)).map((r) => [r.externalId, r]))
    expect(rows.e.seniority).toBe('entry')
    expect(rows.g.seniority).toBe('above-entry')
    expect(rows.i.seniority).toBeUndefined()
    expect(rows.i.level).toBe('internship')
  })

  // A job on an entry level page that never came back would be called above
  // entry wrongly, so a slice not read whole says nothing about any job.
  it('calls nothing above entry when a small slice was not read whole', async () => {
    const http = async (url) => {
      if (url.includes('entry_level') && url.includes('job_functions=9')) throw new Error('HTTP 500')
      return { json: async () => ({ objects: [{ id: url.includes('entry_level') ? 'e' : 'g', title: 'SDE 1' }] }) }
    }
    const rows = Object.fromEntries((await instahyre().fetch(http)).map((r) => [r.externalId, r]))
    expect(rows.e.seniority).toBe('entry')
    expect(rows.g.seniority).toBeUndefined()
  })

  // The server answers 400 to a fourth job_functions value and to the
  // comma-joined spelling, so every request has to stay within three.
  it('never asks for more than three functions in one request', async () => {
    const { urls, http } = capture()
    await instahyre().fetch(http)
    for (const u of urls) {
      expect(u.match(/job_functions=\d+/g)).toHaveLength(3)
      expect(u).not.toMatch(/job_functions=\d+,/)
    }
  })

  it('sets level only on rows from the internship slice', async () => {
    const http = async (url) => ({
      json: async () => ({ objects: [{ id: url.includes('job_type=2') ? 'i' : 'f', title: 'Dev' }] }),
    })
    const rows = await instahyre().fetch(http)
    expect(rows.filter((r) => r.externalId === 'i').every((r) => r.level === 'internship')).toBe(true)
    expect(rows.filter((r) => r.externalId === 'f').every((r) => r.level === undefined)).toBe(true)
  })

  it('returns nothing for an empty payload', async () => {
    expect(await instahyre().fetch(async () => ({ json: async () => ({}) }))).toEqual([])
  })

  it('keeps the pages that worked when one page fails', async () => {
    const http = async (url) => {
      if (url.includes('job_type=2')) throw new Error('HTTP 500')
      return { json: async () => ({ objects: [{ id: url.includes('entry_level') ? 'e' : 'g', title: 'Dev' }] }) }
    }
    expect((await instahyre().fetch(http)).map((r) => r.externalId).sort()).toEqual(['e', 'g'])
  })
})
