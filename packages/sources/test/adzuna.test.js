import { describe, it, expect, afterEach } from 'vitest'
import { adzuna, toRaw } from '@jobdekho/sources/boards/adzuna.js'

const fixture = {
  results: [{
    id: 4812345678,
    title: 'Backend Developer',
    company: { display_name: 'Acme India' },
    location: { display_name: 'Bengaluru, Karnataka' },
    redirect_url: 'https://www.adzuna.in/land/ad/4812345678',
    description: '<p>Build &amp; ship services</p>',
    category: { label: 'IT Jobs' },
    created: '2026-08-14T09:00:00Z',
    salary_min: 900000,
    salary_max: 1400000,
  }],
}
const http = async () => ({ json: async () => fixture })

afterEach(() => {
  delete process.env.ADZUNA_APP_ID
  delete process.env.ADZUNA_APP_KEY
})

describe('adzuna adapter', () => {
  it('names itself by country', () => {
    expect(adzuna().name).toBe('adzuna:in')
  })

  // Missing keys must surface as a per-source failure the runner records, not a
  // silent empty result that looks like the board simply had no jobs.
  it('throws when credentials are absent', async () => {
    await expect(adzuna().fetch(http)).rejects.toThrow(/ADZUNA_APP_ID/)
  })

  it('maps results once credentials are present', async () => {
    process.env.ADZUNA_APP_ID = 'id'
    process.env.ADZUNA_APP_KEY = 'key'
    const raws = await adzuna().fetch(http)
    expect(raws).toHaveLength(3) // one per paged request
    expect(raws[0]).toMatchObject({
      externalId: '4812345678',
      title: 'Backend Developer',
      company: 'Acme India',
      location: 'Bengaluru, Karnataka',
      url: 'https://www.adzuna.in/land/ad/4812345678',
      tags: ['IT Jobs'],
    })
    expect(raws[0].description).toContain('Build')
    expect(raws[0].description).not.toContain('<p>')
  })
})

describe('adzuna salary', () => {
  it('formats a range', () => {
    expect(toRaw(fixture.results[0]).stipend).toBe('9,00,000 - 14,00,000 /year')
  })

  it('formats a single figure', () => {
    expect(toRaw({ id: 1, salary_min: 500000, salary_max: 500000 }).stipend).toBe('5,00,000 /year')
  })

  it('reports nothing when the salary is absent', () => {
    expect(toRaw({ id: 1 }).stipend).toBeNull()
  })
})
