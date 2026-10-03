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
  it('takes the company from the config entry when it gives one, else from the slug', async () => {
    const [named] = await ashby({ slug: 'fathom.video', company: 'Fathom' }).fetch(http)
    expect(named.company).toBe('Fathom')
    const [plain] = await ashby({ slug: 'acme' }).fetch(http)
    expect(plain.company).toBe('Acme')
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

  // A full-time role is filed as a job, in the board's own words, which
  // keeps core from inferring an internship from its text; the level is
  // still core's to read.
  it('marks a full-time role as a job and leaves its level to core', async () => {
    const [r] = await ashby({ slug: 'acme' }).fetch(http)
    expect(r).toMatchObject({ type: 'job', employment: 'FullTime' })
    expect(r.level).toBeUndefined()
  })

  it('reads the workplace type, and a remote flag where there is none', async () => {
    const one = (job) => async () => ({ json: async () => ({ jobs: [{ id: 'w', title: 'X', ...job }] }) })
    expect((await ashby({ slug: 'acme' }).fetch(one({ workplaceType: 'Hybrid' })))[0].workMode).toBe('hybrid')
    expect((await ashby({ slug: 'acme' }).fetch(one({ workplaceType: 'OnSite' })))[0].workMode).toBe('onsite')
    expect((await ashby({ slug: 'acme' }).fetch(one({ workplaceType: null, isRemote: true })))[0].workMode).toBe('remote')
    expect((await ashby({ slug: 'acme' }).fetch(one({})))[0].workMode).toBeUndefined()
  })

  // includeCompensation=true: the salary component, with its currency first,
  // so a dollar range is never read as rupees.
  it('asks for compensation and keeps the salary as pay text', async () => {
    const asked = []
    const comp = { summaryComponents: [
      { compensationType: 'EquityPercentage', interval: 'NONE', currencyCode: null, minValue: null, maxValue: null },
      { compensationType: 'Salary', interval: '1 YEAR', currencyCode: 'USD', minValue: 200000, maxValue: 270000 },
    ] }
    const withPay = async (url) => {
      asked.push(url)
      return { json: async () => ({ jobs: [{ id: 'p', title: 'PM', compensation: comp }] }) }
    }
    const [r] = await ashby({ slug: 'acme' }).fetch(withPay)
    expect(asked[0]).toContain('includeCompensation=true')
    expect(r.stipend).toBe('USD 200,000 - 270,000 /year')
    const [none] = await ashby({ slug: 'acme' }).fetch(http)
    expect(none.stipend).toBeUndefined()
  })

  it('sets level when Ashby reports an internship', async () => {
    const intern = async () => ({
      json: async () => ({ jobs: [{ id: 'a4', title: 'Data Intern', employmentType: 'Intern' }] }),
    })
    const [r] = await ashby({ slug: 'acme' }).fetch(intern)
    expect(r.level).toBe('internship')
  })
})

describe('ashby conditional read', () => {
  it('reports an unchanged board on a 304 and returns nothing', async () => {
    const heard = []
    const context = { etagFor: () => 'W/"job-board:1"', unchanged: (name) => heard.push(name) }
    const out = await ashby({ slug: 'acme' }).fetch(async () => ({ status: 304 }), context)
    expect(out).toEqual([])
    expect(heard).toEqual(['ashby:acme'])
  })

  it('is complete: the reply is the whole board', () => {
    expect(ashby({ slug: 'acme' }).complete).toBe(true)
  })
})
