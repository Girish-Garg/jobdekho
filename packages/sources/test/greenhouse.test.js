import { describe, it, expect } from 'vitest'
import { greenhouse } from '@jobdekho/sources/providers/greenhouse.js'

const fixture = {
  jobs: [{
    id: 5, title: 'Software Engineering Intern',
    location: { name: 'Bengaluru, India' },
    absolute_url: 'https://boards.greenhouse.io/acme/jobs/5',
    content: '<p>Build &amp; ship. Pursuing a B.Tech.</p>',
    first_published: '2026-05-01T00:00:00Z', updated_at: '2026-06-10T00:00:00Z',
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

  // content=false returns an empty body, which silently blinds the degree
  // classifier, so the request itself is asserted.
  it('requests the job body so degree requirements survive', async () => {
    let seen = ''
    const spy = async (url) => { seen = url; return { json: async () => fixture } }
    await greenhouse({ slug: 'acme' }).fetch(spy)
    expect(seen).toContain('content=true')
    expect(seen).not.toContain('content=false')
  })

  it('carries the stripped body through for degree detection', async () => {
    const [raw] = await greenhouse({ slug: 'acme' }).fetch(http)
    expect(raw.description).toContain('B.Tech')
    expect(raw.description).toContain('Build & ship')
    expect(raw.description).not.toContain('<p>')
  })

  // type is derived from level in core/normalize.js. A hardcoded 'job' here
  // stopped an internship title from ever classifying as one.
  it('does not hardcode type', async () => {
    const [raw] = await greenhouse({ slug: 'acme' }).fetch(http)
    expect(raw.type).toBeUndefined()
    expect(raw.level).toBeUndefined()
  })

  // updated_at moves on every recruiter edit, which reset an old posting to
  // "posted today" and corrupted the default newest-first sort.
  it('prefers first_published over updated_at', async () => {
    const [raw] = await greenhouse({ slug: 'acme' }).fetch(http)
    expect(raw.postedAt).toBe('2026-05-01T00:00:00.000Z')
  })

  it('falls back to updated_at when first_published is absent', async () => {
    const noFirstPublished = async () => ({
      json: async () => ({
        jobs: [{ ...fixture.jobs[0], first_published: undefined }],
      }),
    })
    const [raw] = await greenhouse({ slug: 'acme' }).fetch(noFirstPublished)
    expect(raw.postedAt).toBe('2026-06-10T00:00:00.000Z')
  })
})
