import { describe, it, expect } from 'vitest'
import { ashby } from '@jobdekho/sources/providers/ashby.js'

const fixture = {
  jobs: [{
    id: 'a1', title: 'Backend Engineer', location: 'Remote, India',
    jobUrl: 'https://jobs.ashbyhq.com/acme/a1', applyUrl: 'https://jobs.ashbyhq.com/acme/a1/a',
    department: 'Engineering', team: 'Platform', employmentType: 'FullTime',
    descriptionPlain: 'Own our services. B.Tech in CS required.',
    descriptionHtml: '<p>Own our services. B.Tech in CS required.</p>',
    publishedAt: '2026-06-28T00:00:00Z',
  }],
}
const http = async () => ({ json: async () => fixture })

describe('ashby adapter', () => {
  it('names itself by slug', () => {
    expect(ashby({ slug: 'acme' }).name).toBe('ashby:acme')
  })
  it('maps jobs to RawPosting', async () => {
    const [r] = await ashby({ slug: 'acme' }).fetch(http)
    expect(r.externalId).toBe('a1')
    expect(r.title).toBe('Backend Engineer')
    expect(r.location).toBe('Remote, India')
    expect(r.url).toBe('https://jobs.ashbyhq.com/acme/a1')
    expect(r.tags).toEqual(['Engineering', 'Platform'])
  })

  // The adapter used to hardcode description: '' which blinded the degree
  // classifier on every Ashby board.
  it('carries descriptionPlain through', async () => {
    const [r] = await ashby({ slug: 'acme' }).fetch(http)
    expect(r.description).toBe('Own our services. B.Tech in CS required.')
  })

  // The plain body writes each link's URL out after its words.
  it('prefers the html body, so links read as their words', async () => {
    const both = async () => ({
      json: async () => ({ jobs: [{
        id: 'a4', title: 'X',
        descriptionPlain: 'Auth https://supabase.com/auth, written in Go',
        descriptionHtml: '<p><a href="https://supabase.com/auth">Auth</a>, written in Go</p>',
      }] }),
    })
    const [r] = await ashby({ slug: 'acme' }).fetch(both)
    expect(r.description).toBe('Auth, written in Go')
  })

  it('falls back to the plain body when there is no html', async () => {
    const plainOnly = async () => ({ json: async () => ({ jobs: [{ id: 'a5', title: 'X', descriptionPlain: 'About us\n\nWe ship.' }] }) })
    const [r] = await ashby({ slug: 'acme' }).fetch(plainOnly)
    expect(r.description).toBe('About us\n\nWe ship.')
  })

  it('falls back to the html body when descriptionPlain is absent', async () => {
    const htmlOnly = async () => ({
      json: async () => ({ jobs: [{ id: 'a2', title: 'X', descriptionHtml: '<p>Ship &amp; learn</p>' }] }),
    })
    const [r] = await ashby({ slug: 'acme' }).fetch(htmlOnly)
    expect(r.description).toContain('Ship & learn')
    expect(r.description).not.toContain('<p>')
  })

  it('yields an empty body rather than throwing when both are absent', async () => {
    const bare = async () => ({ json: async () => ({ jobs: [{ id: 'a3', title: 'X', applyUrl: 'u' }] }) })
    const [r] = await ashby({ slug: 'acme' }).fetch(bare)
    expect(r.description).toBe('')
    expect(r.url).toBe('u')
    expect(r.postedAt).toBeNull()
  })

  // type is derived from level in core/normalize.js.
  it('does not hardcode type, and leaves level to core for a full-time role', async () => {
    const [r] = await ashby({ slug: 'acme' }).fetch(http)
    expect(r.type).toBeUndefined()
    expect(r.level).toBeUndefined()
  })

  it('sets level when Ashby reports an internship', async () => {
    const intern = async () => ({
      json: async () => ({ jobs: [{ id: 'a4', title: 'Data Intern', employmentType: 'Intern' }] }),
    })
    const [r] = await ashby({ slug: 'acme' }).fetch(intern)
    expect(r.level).toBe('internship')
  })
})
