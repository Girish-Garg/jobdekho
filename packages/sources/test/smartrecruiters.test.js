import { describe, it, expect } from 'vitest'
import { smartrecruiters } from '@jobdekho/sources/providers/smartrecruiters.js'

const fixture = {
  offset: 0,
  limit: 100,
  totalFound: 2,
  content: [
    {
      id: '744000133907678',
      name: 'Software Engineer',
      company: { identifier: 'Acme', name: 'Acme Corp' },
      releasedDate: '2026-06-24T10:00:11.853Z',
      location: { city: 'Bengaluru', region: 'KA', country: 'in', remote: false, fullLocation: 'Bengaluru, KA, India' },
      department: { id: '868639', label: 'Engineering' },
      function: { id: 'engineering', label: 'Engineering' },
      typeOfEmployment: { id: 'permanent', label: 'Full-time' },
      experienceLevel: { id: 'mid_senior_level', label: 'Mid-Senior Level' },
      jobAd: { sections: { jobDescription: { text: '<p>Build &amp; ship. B.Tech required.</p>' } } },
    },
    {
      id: '744000133907679',
      name: 'Product Design Intern',
      company: { identifier: 'Acme', name: 'Acme Corp' },
      releasedDate: '2026-07-01T00:00:00.000Z',
      location: { city: 'Pune', region: 'MH', country: 'in', remote: true },
      typeOfEmployment: { id: 'internship', label: 'Internship' },
      experienceLevel: { id: 'internship', label: 'Internship' },
    },
  ],
}
const http = async () => ({ json: async () => fixture })

describe('smartrecruiters adapter', () => {
  it('names itself by slug', () => {
    expect(smartrecruiters({ slug: 'Acme' }).name).toBe('smartrecruiters:Acme')
  })

  it('maps postings to RawPosting', async () => {
    const [r] = await smartrecruiters({ slug: 'Acme' }).fetch(http)
    expect(r.externalId).toBe('744000133907678')
    expect(r.title).toBe('Software Engineer')
    expect(r.company).toBe('Acme Corp')
    expect(r.location).toBe('Bengaluru, KA, India')
    expect(r.url).toBe('https://jobs.smartrecruiters.com/Acme/744000133907678')
    expect(r.tags).toEqual(['Engineering', 'Engineering', 'Full-time'])
    expect(r.postedAt).toBe('2026-06-24T10:00:11.853Z')
  })

  it('strips html out of the job ad body', async () => {
    const [r] = await smartrecruiters({ slug: 'Acme' }).fetch(http)
    expect(r.description).toContain('Build & ship')
    expect(r.description).not.toContain('<p>')
  })

  it('leaves level unset when the platform does not know it', async () => {
    const [r] = await smartrecruiters({ slug: 'Acme' }).fetch(http)
    expect(r.level).toBeUndefined()
  })

  it('sets level from an explicit internship employment type', async () => {
    const [, r] = await smartrecruiters({ slug: 'Acme' }).fetch(http)
    expect(r.level).toBe('internship')
  })

  it('builds a location from parts and flags remote', async () => {
    const [, r] = await smartrecruiters({ slug: 'Acme' }).fetch(http)
    expect(r.location).toBe('Remote - Pune, MH, IN')
  })

  it('drops the empty segment platforms leave in fullLocation', async () => {
    const gappy = async () => ({
      json: async () => ({ content: [{ id: 1, name: 'X', location: { fullLocation: 'Chennai, , India' } }] }),
    })
    const [r] = await smartrecruiters({ slug: 'Acme' }).fetch(gappy)
    expect(r.location).toBe('Chennai, India')
  })

  it('returns an empty list when content is missing', async () => {
    const empty = async () => ({ json: async () => ({}) })
    expect(await smartrecruiters({ slug: 'Acme' }).fetch(empty)).toEqual([])
  })
})

// The list fixture above already carries jobAd on one row to cover the case
// where the list endpoint starts returning it. These postings carry none, so
// every description below can only have come from the detail call.
const detailList = {
  totalFound: 2,
  content: [
    { id: '201', name: 'Backend Engineer', company: { name: 'Acme Corp' }, location: { fullLocation: 'Pune, India' } },
    { id: '202', name: 'Frontend Engineer', company: { name: 'Acme Corp' }, location: { fullLocation: 'Pune, India' } },
  ],
}

// The same companyDescription boilerplate on both, so excluding it is the
// only reason the two bodies below do not also read alike.
const detailBodies = {
  201: {
    jobAd: {
      sections: {
        companyDescription: { text: '<p>Acme has been hiring since 1990.</p>' },
        jobDescription: { text: '<p>Own the payments API.</p>' },
        qualifications: { text: '<p>B.Tech required.</p>' },
        additionalInformation: { text: '<p>Hybrid, 3 days onsite.</p>' },
      },
    },
  },
  202: {
    jobAd: {
      sections: {
        companyDescription: { text: '<p>Acme has been hiring since 1990.</p>' },
        jobDescription: { text: '<p>Ship the design system.</p>' },
        qualifications: { text: '<p>Portfolio required.</p>' },
        additionalInformation: { text: '<p>Remote friendly.</p>' },
      },
    },
  },
}

// Routes on the URL shape rather than tracking call order, so it behaves like
// the real pair of endpoints regardless of which posting the pool reaches first.
function detailHttp({ failId } = {}) {
  return async (reqUrl) => {
    if (reqUrl.includes('/postings?')) return { json: async () => detailList }
    const id = reqUrl.split('/').pop()
    if (id === failId) throw new Error('timeout')
    return { json: async () => detailBodies[id] || {} }
  }
}

describe('smartrecruiters detail fetch', () => {
  it('assembles the body from jobDescription, qualifications and additionalInformation', async () => {
    const [r] = await smartrecruiters({ slug: 'Acme' }).fetch(detailHttp())
    expect(r.description).toContain('Own the payments API')
    expect(r.description).toContain('B.Tech required')
    expect(r.description).toContain('Hybrid, 3 days onsite')
    expect(r.description).not.toContain('<p>')
  })

  it('excludes companyDescription so postings at one company do not read alike', async () => {
    const [r] = await smartrecruiters({ slug: 'Acme' }).fetch(detailHttp())
    expect(r.description).not.toContain('hiring since 1990')
  })

  it('leaves only the failed posting body-less, its sibling still gets its body', async () => {
    const [r1, r2] = await smartrecruiters({ slug: 'Acme' }).fetch(detailHttp({ failId: '201' }))
    expect(r1.description).toBe('')
    expect(r2.description).toContain('Ship the design system')
  })
})
