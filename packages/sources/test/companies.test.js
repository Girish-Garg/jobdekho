import { describe, it, expect } from 'vitest'
import { amazon } from '@jobdekho/sources/companies/amazon.js'
import { microsoft } from '@jobdekho/sources/companies/microsoft.js'
import { google } from '@jobdekho/sources/companies/google.js'
import { ey } from '@jobdekho/sources/companies/ey.js'

const httpFor = (payload) => async () => ({ json: async () => payload })

describe('company adapters', () => {
  it('amazon maps jobs', async () => {
    const http = httpFor({ jobs: [{ id_icims: '1', title: 'SDE Intern', normalized_location: 'Bengaluru', job_path: '/en/jobs/1', description_short: 'd', job_category: 'Software', posted_date: '2026-06-01' }] })
    const [r] = await amazon().fetch(http)
    expect(r.externalId).toBe('1')
    expect(r.url).toBe('https://www.amazon.jobs/en/jobs/1')
    expect(r.company).toBe('Amazon')
  })
  it('microsoft maps jobs', async () => {
    const http = httpFor({ operationResult: { result: { jobs: [{ jobId: '2', title: 'Intern', properties: { locations: ['Hyderabad'], description: 'd', profession: 'Eng' }, postingDate: '2026-06-02' }] } } })
    const [r] = await microsoft().fetch(http)
    expect(r.externalId).toBe('2')
    expect(r.location).toBe('Hyderabad')
    expect(r.url).toContain('/job/2')
  })
  it('google maps jobs', async () => {
    const http = httpFor({ jobs: [{ id: 'jobs/3', title: 'Intern', locations: [{ display: 'Bengaluru, India' }], apply_url: 'https://careers.google.com/jobs/3', summary: 's', publish_date: '2026-06-03' }] })
    const [r] = await google().fetch(http)
    expect(r.externalId).toBe('jobs/3')
    expect(r.location).toBe('Bengaluru, India')
    expect(r.company).toBe('Google')
  })
  it('ey maps jobs', async () => {
    const http = httpFor({ data: { jobs: [{ jobId: '4', title: 'Intern', location: 'Gurgaon', applyUrl: 'https://careers.ey.com/ey/job/4', descriptionTeaser: 'd', postedDate: '2026-06-04' }] } })
    const [r] = await ey().fetch(http)
    expect(r.externalId).toBe('4')
    expect(r.url).toBe('https://careers.ey.com/ey/job/4')
    expect(r.company).toBe('EY')
  })
})
