import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { infosys } from '@jobdekho/sources/companies/infosys.js'
import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'

// Field names and formats as intapgateway.infosysapps.com's
// getCareerSearchJobs returned them on 2026-09-30, two rows, text replaced.
const ROWS = JSON.parse(readFileSync(new URL('./fixtures/infosys-jobs.json', import.meta.url), 'utf8'))
const RULES = JSON.parse(readFileSync(new URL('../../../config/filters.json', import.meta.url), 'utf8'))

function fakeInfosys(rows = ROWS) {
  const urls = []
  const http = async (url) => {
    urls.push(url)
    return { json: async () => rows }
  }
  return { http, urls }
}

describe('infosys adapter', () => {
  it("asks once for the site's India lists, lateral and fresher", async () => {
    const fake = fakeInfosys()
    await infosys().fetch(fake.http)
    expect(fake.urls).toHaveLength(1)
    const url = new URL(fake.urls[0])
    expect(url.pathname).toBe('/careersci/search/intapjbsrch/getCareerSearchJobs')
    expect(url.searchParams.get('sourceId')).toBe('1,21')
    expect(url.searchParams.get('searchText')).toBe('ALL')
  })

  it('maps a row to RawPosting', async () => {
    const [r] = await infosys().fetch(fakeInfosys().http)
    expect(r.externalId).toBe('INFSYS-EXTERNAL-253001')
    expect(r.title).toBe('Java Developer')
    expect(r.company).toBe('Infosys')
    expect(r.location).toBe('Bangalore, India')
    expect(r.url).toBe('https://career.infosys.com/jobdesc?jobReferenceCode=INFSYS-EXTERNAL-253001&sourceId=1')
    expect(r.tags).toEqual(['Application Development and Maintenance', 'Application Development'])
    expect(r.experience).toBe('3 - 5 years')
    expect(r.level).toBeUndefined()
  })

  // createdOn carries no zone; read as UTC so it does not move with the machine.
  it('pins the zoneless date to UTC', async () => {
    const [r, s] = await infosys().fetch(fakeInfosys().http)
    expect(r.postedAt).toBe('2026-09-29T13:37:38.743Z')
    expect(s.postedAt).toBe('2026-09-28T09:00:00.000Z')
  })

  it('folds the requirement fields into a plain-text body', async () => {
    const [r, s] = await infosys().fetch(fakeInfosys().http)
    expect(r.description).toContain('Responsibilities\n\nBuild and maintain Java services for clients.')
    expect(r.description).toContain('Technical requirements')
    expect(r.description).toContain('Educational requirements\n\nBachelor of Engineering')
    expect(s.description.startsWith('Run the Azure platform.')).toBe(true)
    expect(s.description).not.toMatch(/<p>/)
  })

  it('tidies a padded, shouted city and keeps the fresher list id in the link', async () => {
    const [, s] = await infosys().fetch(fakeInfosys().http)
    expect(s.location).toBe('Pune, India')
    expect(s.url).toContain('sourceId=21')
  })

  it('drops a row from outside India or without a reference', async () => {
    const rows = [...ROWS, { ...ROWS[0], referenceCode: 'INFSYS-EXTERNAL-9', country: 'China' }, { ...ROWS[0], referenceCode: null }]
    expect(await infosys().fetch(fakeInfosys(rows).http)).toHaveLength(2)
  })

  it('passes core normalize and the default filters', async () => {
    const [r] = await infosys().fetch(fakeInfosys().http)
    const p = normalize(r, 'infosys')
    expect(p.degreeMin).toBe('bachelors')
    expect(p.experienceYears).toBe(3)
    expect(filter(p, RULES)).toBe(true)
  })

  it('returns an empty list for a payload that is not a list', async () => {
    expect(await infosys().fetch(fakeInfosys({}).http)).toEqual([])
  })
})

// The one call is every open job, so a posting it stops listing can be
// closed; an empty answer could be an outage, so it never says so.
describe('infosys list', () => {
  it('is complete when it answers jobs, and not when it answers none', async () => {
    const adapter = infosys()
    await adapter.fetch(fakeInfosys().http)
    expect(adapter.complete).toBe(true)
    const empty = infosys()
    await empty.fetch(fakeInfosys({}).http)
    expect(empty.complete).toBe(false)
  })
})
