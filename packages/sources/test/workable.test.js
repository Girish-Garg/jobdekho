import { describe, it, expect } from 'vitest'
import { workable } from '@jobdekho/sources/providers/workable.js'

const fixture = {
  name: 'Acme Corp',
  description: '<p>About Acme</p>',
  jobs: [
    {
      title: 'Backend Engineer',
      shortcode: '186545F8C1',
      code: null,
      employment_type: 'Full-time',
      telecommuting: false,
      department: 'Engineering',
      url: 'https://apply.workable.com/j/186545F8C1',
      shortlink: 'https://apply.workable.com/j/186545F8C1',
      application_url: 'https://apply.workable.com/j/186545F8C1/apply',
      published_on: '2026-02-12',
      created_at: '2025-09-30',
      country: 'India',
      city: 'Bengaluru',
      state: 'Karnataka',
      education: "Bachelor's Degree",
      experience: 'Associate',
      function: 'Software Engineering',
      locations: [{ country: 'India', countryCode: 'IN', city: 'Bengaluru', region: 'Karnataka' }],
      description: '<p>Ship services &amp; APIs</p>',
      requirements: '<p>3 years of Node</p>',
    },
    {
      title: 'Data Intern',
      shortcode: 'ZZ99',
      employment_type: 'Internship',
      telecommuting: true,
      city: 'Remote',
      country: 'India',
      shortlink: 'https://apply.workable.com/j/ZZ99',
      published_on: '2026-07-04',
    },
  ],
}
const http = async () => ({ json: async () => fixture })

describe('workable adapter', () => {
  it('names itself by slug', () => {
    expect(workable({ slug: 'acme' }).name).toBe('workable:acme')
  })

  it('maps jobs to RawPosting', async () => {
    const [r] = await workable({ slug: 'acme' }).fetch(http)
    expect(r.externalId).toBe('186545F8C1')
    expect(r.title).toBe('Backend Engineer')
    expect(r.company).toBe('Acme Corp')
    expect(r.location).toBe('Bengaluru, Karnataka, India')
    expect(r.url).toBe('https://apply.workable.com/j/186545F8C1')
    expect(r.tags).toEqual(['Engineering', 'Software Engineering', 'Full-time'])
    expect(r.postedAt).toBe('2026-02-12T00:00:00.000Z')
  })

  it('folds description, requirements and education into one plain body', async () => {
    const [r] = await workable({ slug: 'acme' }).fetch(http)
    expect(r.description).toContain('Ship services & APIs')
    expect(r.description).toContain('3 years of Node')
    expect(r.description).toContain("Bachelor's Degree")
    expect(r.description).not.toContain('<p>')
  })

  it('leaves level unset for a normal full-time role', async () => {
    const [r] = await workable({ slug: 'acme' }).fetch(http)
    expect(r.level).toBeUndefined()
  })

  it('sets level and marks remote for an internship', async () => {
    const [, r] = await workable({ slug: 'acme' }).fetch(http)
    expect(r.level).toBe('internship')
    expect(r.location).toBe('Remote - Remote, India')
    expect(r.url).toBe('https://apply.workable.com/j/ZZ99')
  })

  it('falls back to the slug when the account has no name', async () => {
    const bare = async () => ({ json: async () => ({ jobs: [{ shortcode: 'A1', title: 'X' }] }) })
    const [r] = await workable({ slug: 'acme' }).fetch(bare)
    expect(r.company).toBe('acme')
    expect(r.location).toBe('')
    expect(r.postedAt).toBeNull()
  })
})
