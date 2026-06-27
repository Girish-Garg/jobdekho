import { describe, it, expect } from 'vitest'
import { greenhouse } from '@jobdekho/sources/providers/greenhouse.js'

const fixture = {
  jobs: [{
    id: 5, title: 'Software Engineering Intern',
    location: { name: 'Bengaluru, India' },
    absolute_url: 'https://boards.greenhouse.io/acme/jobs/5',
    content: '<p>Build &amp; ship</p>', updated_at: '2026-06-10T00:00:00Z',
    departments: [{ name: 'Engineering' }],
  }],
}
const http = async () => ({ json: async () => fixture })

describe('greenhouse adapter', () => {
  it('names itself by slug', () => {
    expect(greenhouse({ slug: 'acme' }).name).toBe('greenhouse:acme')
  })
  it('maps jobs to RawPosting', async () => {
    const [raw] = await greenhouse({ slug: 'acme' }).fetch(http)
    expect(raw.externalId).toBe('5')
    expect(raw.title).toBe('Software Engineering Intern')
    expect(raw.location).toBe('Bengaluru, India')
    expect(raw.url).toBe('https://boards.greenhouse.io/acme/jobs/5')
    expect(raw.description).toContain('Build')
    expect(raw.tags).toEqual(['Engineering'])
  })
})
