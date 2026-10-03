import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { describable, describePosting } from '@jobdekho/sources/describe.js'

// Every request here is a fake: no board is reached.
const view = readFileSync(new URL('./fixtures/linkedin-job-view.html', import.meta.url), 'utf8')

describe('describable', () => {
  it('names the boards whose postings can be read one at a time', () => {
    expect(describable('linkedin')).toBe(true)
    expect(describable('smartrecruiters:BoschGroup')).toBe(true)
  })

  // Instahyre publishes no description, and the rest send it with the list.
  it('leaves out every other source', () => {
    expect(describable('instahyre')).toBe(false)
    expect(describable('greenhouse:stripe')).toBe(false)
    expect(describable('')).toBe(false)
  })
})

describe('describePosting', () => {
  it('reads a LinkedIn posting through the paced requester it is given', async () => {
    const asked = []
    const get = async (url) => {
      asked.push(url)
      return view
    }
    const page = await describePosting({ get }, { source: 'linkedin', externalId: '4400000001' })
    expect(asked).toEqual(['https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/4400000001'])
    expect(page.description).toContain('Northwind Labs')
    expect(page).toMatchObject({ level: 'internship', employment: 'Internship' })
  })

  it('reads a SmartRecruiters posting from its public detail', async () => {
    const asked = []
    const http = async (url) => {
      asked.push(url)
      return { json: async () => ({ jobAd: { sections: { jobDescription: { title: 'Job Description', text: '<p>Build tools.</p>' } } } }) }
    }
    const page = await describePosting({ http }, { source: 'smartrecruiters:BoschGroup', externalId: '7440001' })
    expect(asked).toEqual(['https://api.smartrecruiters.com/v1/companies/BoschGroup/postings/7440001'])
    expect(page).toEqual({ description: 'Job Description\n\nBuild tools.' })
  })

  it('refuses a source it cannot describe', async () => {
    await expect(describePosting({}, { source: 'instahyre', externalId: '1' })).rejects.toThrow(/cannot be described/)
  })
})
