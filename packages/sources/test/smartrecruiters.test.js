import { describe, it, expect } from 'vitest'
import { smartrecruiters } from '@jobdekho/sources/providers/smartrecruiters.js'

const fixture = {
  offset: 0,
  limit: 100,
  totalFound: 2,
  content: [
    {
      id: '744000133907678',
      name: 'Software Engineer',
      company: { identifier: 'Acme', name: 'Acme Corp' },
      releasedDate: '2026-06-24T10:00:11.853Z',
      location: { city: 'Bengaluru', region: 'KA', country: 'in', remote: false, fullLocation: 'Bengaluru, KA, India' },
      department: { id: '868639', label: 'Engineering' },
      function: { id: 'engineering', label: 'Engineering' },
      typeOfEmployment: { id: 'permanent', label: 'Full-time' },
      experienceLevel: { id: 'mid_senior_level', label: 'Mid-Senior Level' },
      jobAd: { sections: { jobDescription: { text: '<p>Build &amp; ship. B.Tech required.</p>' } } },
    },
    {
      id: '744000133907679',
      name: 'Product Design Intern',
      company: { identifier: 'Acme', name: 'Acme Corp' },
      releasedDate: '2026-07-01T00:00:00.000Z',
      location: { city: 'Pune', region: 'MH', country: 'in', remote: true },
      typeOfEmployment: { id: 'internship', label: 'Internship' },
      experienceLevel: { id: 'internship', label: 'Internship' },
    },
  ],
}
const http = async () => ({ json: async () => fixture })

describe('smartrecruiters adapter', () => {
  it('names itself by slug', () => {
    expect(smartrecruiters({ slug: 'Acme' }).name).toBe('smartrecruiters:Acme')
  })

  it('maps postings to RawPosting', async () => {
    const [r] = await smartrecruiters({ slug: 'Acme' }).fetch(http)
    expect(r.externalId).toBe('744000133907678')
    expect(r.title).toBe('Software Engineer')
    expect(r.company).toBe('Acme Corp')
    expect(r.location).toBe('Bengaluru, KA, India')
    expect(r.url).toBe('https://jobs.smartrecruiters.com/Acme/744000133907678')
    expect(r.tags).toEqual(['Engineering', 'Engineering', 'Full-time'])
    expect(r.postedAt).toBe('2026-06-24T10:00:11.853Z')
  })

  it('strips html out of the job ad body', async () => {
    const [r] = await smartrecruiters({ slug: 'Acme' }).fetch(http)
    expect(r.description).toContain('Build & ship')
    expect(r.description).not.toContain('<p>')
  })

  it('leaves level unset when the platform does not know it', async () => {
    const [r] = await smartrecruiters({ slug: 'Acme' }).fetch(http)
    expect(r.level).toBeUndefined()
  })

  it('sets level from an explicit internship employment type', async () => {
    const [, r] = await smartrecruiters({ slug: 'Acme' }).fetch(http)
    expect(r.level).toBe('internship')
  })

  it('builds a location from parts and flags remote', async () => {
    const [, r] = await smartrecruiters({ slug: 'Acme' }).fetch(http)
    expect(r.location).toBe('Remote - Pune, MH, IN')
  })

  it('drops the empty segment platforms leave in fullLocation', async () => {
    const gappy = async () => ({
      json: async () => ({ content: [{ id: 1, name: 'X', location: { fullLocation: 'Chennai, , India' } }] }),
    })
    const [r] = await smartrecruiters({ slug: 'Acme' }).fetch(gappy)
    expect(r.location).toBe('Chennai, India')
  })

  it('returns an empty list when content is missing', async () => {
    const empty = async () => ({ json: async () => ({}) })
    expect(await smartrecruiters({ slug: 'Acme' }).fetch(empty)).toEqual([])
  })
})
