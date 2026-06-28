import { describe, it, expect } from 'vitest'
import { ashby } from '@jobdekho/sources/providers/ashby.js'

const fixture = {
  jobs: [{
    id: 'a1', title: 'Backend Engineer', location: 'Remote, India',
    jobUrl: 'https://jobs.ashbyhq.com/acme/a1', department: 'Engineering', team: 'Platform',
    publishedAt: '2026-06-28T00:00:00Z',
  }],
}
const http = async () => ({ json: async () => fixture })

describe('ashby adapter', () => {
  it('names itself by slug', () => {
    expect(ashby({ slug: 'acme' }).name).toBe('ashby:acme')
  })
  it('maps jobs to RawPosting with type job', async () => {
    const [r] = await ashby({ slug: 'acme' }).fetch(http)
    expect(r.externalId).toBe('a1')
    expect(r.title).toBe('Backend Engineer')
    expect(r.location).toBe('Remote, India')
    expect(r.url).toBe('https://jobs.ashbyhq.com/acme/a1')
    expect(r.type).toBe('job')
    expect(r.tags).toEqual(['Engineering', 'Platform'])
  })
})
