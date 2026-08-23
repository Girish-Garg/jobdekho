import { describe, it, expect } from 'vitest'
import { lever } from '@jobdekho/sources/providers/lever.js'

const fixture = [{
  id: 'xyz', text: 'Data Science Intern',
  categories: { location: 'Remote', team: 'Data', commitment: 'Internship' },
  hostedUrl: 'https://jobs.lever.co/acme/xyz',
  descriptionPlain: 'Analyze data', createdAt: 1718000000000,
}]
const http = async () => ({ json: async () => fixture })

describe('lever adapter', () => {
  it('maps postings to RawPosting', async () => {
    const [raw] = await lever({ slug: 'acme' }).fetch(http)
    expect(raw.externalId).toBe('xyz')
    expect(raw.title).toBe('Data Science Intern')
    expect(raw.location).toBe('Remote')
    expect(raw.url).toBe('https://jobs.lever.co/acme/xyz')
    expect(raw.tags).toEqual(['Data', 'Internship'])
    expect(typeof raw.postedAt).toBe('string')
  })

  // type is derived from level in core/normalize.js; the commitment field is a
  // real platform signal, so level is set from it.
  it('does not hardcode type and reads level from commitment', async () => {
    const [raw] = await lever({ slug: 'acme' }).fetch(http)
    expect(raw.type).toBeUndefined()
    expect(raw.level).toBe('internship')
  })

  it('leaves level unset for a full-time commitment', async () => {
    const fullTime = async () => ({
      json: async () => [{ id: 'a', text: 'Engineer', categories: { commitment: 'Full-time' } }],
    })
    const [raw] = await lever({ slug: 'acme' }).fetch(fullTime)
    expect(raw.level).toBeUndefined()
    expect(raw.postedAt).toBeNull()
  })
})
