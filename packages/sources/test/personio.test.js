import { describe, it, expect } from 'vitest'
import { personio } from '@jobdekho/sources/providers/personio.js'

// search.json returns a bare array, which is what every live tenant returns.
const fixture = [
  {
    id: 2430091,
    name: 'Sales Consultant',
    employment_type: 'Permanent employee',
    seniority: 'Experienced',
    keywords: '',
    description: '',
    office: 'Heidelberg, Germany | hybrid',
    offices: ['Heidelberg, Germany | hybrid'],
    schedule: 'Full-time',
    category: 'Sales',
    department: 'Sales',
    subcompany: 'Acme Digital GmbH',
    createdAt: '2026-01-05T00:00:00+01:00',
  },
  {
    id: 2430092,
    name: 'Working Student Data',
    employment_type: 'Intern / Student',
    seniority: 'Student (Intern)',
    offices: ['Remote', 'Munich, Germany'],
    department: 'Data',
    jobDescriptions: [{ name: 'Your mission', value: '<p>Analyse &amp; report. B.Sc. in progress.</p>' }],
  },
]
const http = async () => ({ json: async () => fixture })

describe('personio adapter', () => {
  it('names itself by slug', () => {
    expect(personio({ slug: 'acme' }).name).toBe('personio:acme')
  })

  it('maps an array payload to RawPosting', async () => {
    const [r] = await personio({ slug: 'acme' }).fetch(http)
    expect(r.externalId).toBe('2430091')
    expect(r.title).toBe('Sales Consultant')
    expect(r.company).toBe('Acme Digital GmbH')
    expect(r.location).toBe('Heidelberg, Germany | hybrid')
    expect(r.url).toBe('https://acme.jobs.personio.de/job/2430091')
    expect(r.tags).toEqual(['Sales', 'Sales', 'Full-time'])
    expect(r.postedAt).toBe('2026-01-04T23:00:00.000Z')
    expect(r.level).toBeUndefined()
  })

  it('flattens jobDescriptions sections into plain text', async () => {
    const [, r] = await personio({ slug: 'acme' }).fetch(http)
    expect(r.description).toContain('Your mission')
    expect(r.description).toContain('Analyse & report')
    expect(r.description).not.toContain('<p>')
  })

  it('sets level from the Intern / Student employment type', async () => {
    const [, r] = await personio({ slug: 'acme' }).fetch(http)
    expect(r.level).toBe('internship')
    expect(r.location).toBe('Remote, Munich, Germany')
    expect(r.postedAt).toBeNull()
  })

  it('accepts a wrapped payload as well as a bare array', async () => {
    const wrapped = async () => ({ json: async () => ({ jobs: [{ id: 7, name: 'QA' }] }) })
    const [r] = await personio({ slug: 'acme' }).fetch(wrapped)
    expect(r.externalId).toBe('7')
    expect(r.company).toBe('acme')
  })

  it('returns an empty list for an unrecognised payload', async () => {
    const odd = async () => ({ json: async () => ({ nope: true }) })
    expect(await personio({ slug: 'acme' }).fetch(odd)).toEqual([])
  })
})
