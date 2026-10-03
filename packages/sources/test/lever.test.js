import { describe, it, expect } from 'vitest'
import { lever } from '@jobdekho/sources/providers/lever.js'

const fixture = [{
  id: 'xyz', text: 'Data Science Intern',
  categories: { location: 'Remote', team: 'Data', commitment: 'Internship' },
  hostedUrl: 'https://jobs.lever.co/acme/xyz',
  descriptionPlain: 'Analyze data', createdAt: 1718000000000,
  lists: [
    { text: 'Requirements', content: '<ul><li>Pursuing a B.Tech</li><li>2+ years Python</li></ul>' },
    { text: 'Nice to have', content: '<ul><li>SQL</li></ul>' },
  ],
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

  it('takes the company from the config entry when it gives one, else the slug', async () => {
    const [named] = await lever({ slug: 'captivateiq', company: 'CaptivateIQ' }).fetch(http)
    expect(named.company).toBe('CaptivateIQ')
    const [plain] = await lever({ slug: 'acme' }).fetch(http)
    expect(plain.company).toBe('acme')
  })

  // descriptionPlain alone is only the intro; degree and experience
  // requirements live in the lists array and the classifier needs both.
  it('folds the lists array into the description', async () => {
    const [raw] = await lever({ slug: 'acme' }).fetch(http)
    expect(raw.description).toContain('Analyze data')
    expect(raw.description).toContain('B.Tech')
    expect(raw.description).toContain('2+ years Python')
    expect(raw.description).toContain('SQL')
    expect(raw.description).not.toContain('<ul>')
    expect(raw.description).not.toContain('<li>')
  })

  it('tolerates a posting with no lists array', async () => {
    const noLists = async () => ({
      json: async () => [{ id: 'a', text: 'Engineer', descriptionPlain: 'Build things' }],
    })
    const [raw] = await lever({ slug: 'acme' }).fetch(noLists)
    expect(raw.description).toBe('Build things')
  })

  // type is derived from level in core/normalize.js; the commitment field is a
  // real platform signal, so level is set from it.
  it('does not hardcode type and reads level from commitment', async () => {
    const [raw] = await lever({ slug: 'acme' }).fetch(http)
    expect(raw.type).toBeUndefined()
    expect(raw.level).toBe('internship')
  })

  // A full-time commitment files the posting as a job: core then never makes
  // it an internship from its text.
  it('leaves level unset for a full-time commitment, and files it as a job', async () => {
    const fullTime = async () => ({
      json: async () => [{ id: 'a', text: 'Engineer', categories: { commitment: 'Full-time' } }],
    })
    const [raw] = await lever({ slug: 'acme' }).fetch(fullTime)
    expect(raw.level).toBeUndefined()
    expect(raw).toMatchObject({ type: 'job', employment: 'Full-time' })
    expect(raw.postedAt).toBeNull()
  })

  it('reads the salary range and the workplace type the posting shows', async () => {
    const one = (job) => async () => ({ json: async () => [{ id: 'a', text: 'Engineer', ...job }] })
    const [paid] = await lever({ slug: 'acme' }).fetch(one({
      salaryRange: { currency: 'INR', interval: 'per-year-salary', min: 1800000, max: 2400000 }, workplaceType: 'hybrid',
    }))
    expect(paid).toMatchObject({ stipend: 'INR 1,800,000 - 2,400,000 /year', workMode: 'hybrid' })
    const [plain] = await lever({ slug: 'acme' }).fetch(one({ workplaceType: 'unspecified' }))
    expect(plain.stipend).toBeUndefined()
    expect(plain.workMode).toBeUndefined()
  })
})
