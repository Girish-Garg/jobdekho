import { describe, it, expect } from 'vitest'
import { recruitee } from '@jobdekho/sources/providers/recruitee.js'

const fixture = {
  offers: [
    {
      id: 2697907,
      slug: 'backend-engineer',
      title: 'Backend Engineer',
      description: '<p>Build the platform &amp; scale it</p>',
      requirements: '<p>Strong Node skills</p>',
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      country: 'India',
      country_code: 'IN',
      department: 'Engineering',
      category_code: 'software_development',
      education_code: 'bachelor_degree',
      experience_code: 'mid_level',
      employment_type_code: 'fulltime_permanent',
      careers_url: 'https://jobs.acme.com/o/backend-engineer',
      careers_apply_url: 'https://jobs.acme.com/o/backend-engineer/c',
      published_at: '2026-08-03 15:40:43 UTC',
      created_at: '2026-08-03 09:42:31 UTC',
      company_name: 'Acme Corp',
      tags: ['nodejs'],
      remote: false,
    },
    {
      id: 2697908,
      title: 'Engineering Intern',
      employment_type_code: 'internship',
      experience_code: 'student_intern',
      remote: true,
      country: 'India',
      careers_apply_url: 'https://jobs.acme.com/o/engineering-intern/c',
      published_at: '2026-08-05 10:00:00 UTC',
    },
  ],
}
const http = async () => ({ json: async () => fixture })

describe('recruitee adapter', () => {
  it('names itself by slug', () => {
    expect(recruitee({ slug: 'acme' }).name).toBe('recruitee:acme')
  })

  it('maps offers to RawPosting', async () => {
    const [r] = await recruitee({ slug: 'acme' }).fetch(http)
    expect(r.externalId).toBe('2697907')
    expect(r.title).toBe('Backend Engineer')
    expect(r.company).toBe('Acme Corp')
    expect(r.location).toBe('Bengaluru, Karnataka, India')
    expect(r.url).toBe('https://jobs.acme.com/o/backend-engineer')
    expect(r.tags).toEqual(['Engineering', 'software_development', 'nodejs'])
  })

  it('normalizes the non-ISO published_at', async () => {
    const [r] = await recruitee({ slug: 'acme' }).fetch(http)
    expect(r.postedAt).toBe('2026-08-03T15:40:43.000Z')
  })

  it('unpacks education_code so the degree classifier can read it', async () => {
    const [r] = await recruitee({ slug: 'acme' }).fetch(http)
    expect(r.description).toContain('bachelor degree')
    expect(r.description).toContain('Build the platform & scale it')
    expect(r.description).not.toContain('<p>')
  })

  it('leaves level unset for a permanent role', async () => {
    const [r] = await recruitee({ slug: 'acme' }).fetch(http)
    expect(r.level).toBeUndefined()
  })

  it('sets level and marks remote for an internship', async () => {
    const [, r] = await recruitee({ slug: 'acme' }).fetch(http)
    expect(r.level).toBe('internship')
    expect(r.location).toBe('Remote - India')
    expect(r.url).toBe('https://jobs.acme.com/o/engineering-intern/c')
  })

  it('returns an empty list when offers is missing', async () => {
    const empty = async () => ({ json: async () => ({}) })
    expect(await recruitee({ slug: 'acme' }).fetch(empty)).toEqual([])
  })
})
