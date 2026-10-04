import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { swiggy } from '@jobdekho/sources/companies/swiggy.js'
import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'

// Field names and formats as swiggy.mynexthire.com's reqlist/get returned
// them on 2026-09-30, two requisitions, text replaced.
const LIST = JSON.parse(readFileSync(new URL('./fixtures/swiggy-reqlist.json', import.meta.url), 'utf8'))
const RULES = JSON.parse(readFileSync(new URL('../../../config/filters.json', import.meta.url), 'utf8'))

function fakeSwiggy(reply = LIST) {
  const calls = []
  const http = async (url, opts = {}) => {
    calls.push({ url, opts })
    return { json: async () => reply }
  }
  return { http, calls }
}

describe('swiggy adapter', () => {
  it("posts the board's own list query once", async () => {
    const fake = fakeSwiggy()
    await swiggy().fetch(fake.http)
    expect(fake.calls).toHaveLength(1)
    const [{ url, opts }] = fake.calls
    expect(url).toBe('https://swiggy.mynexthire.com/employer/careers/reqlist/get')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual({ source: 'careers', code: '', filterByBuId: -1 })
  })

  it('maps a requisition to RawPosting', async () => {
    const [r] = await swiggy().fetch(fakeSwiggy().http)
    expect(r.externalId).toBe('28001')
    expect(r.title).toBe('Software Development Engineer II')
    expect(r.company).toBe('Swiggy')
    expect(r.location).toBe('Bangalore, India')
    expect(r.postedAt).toBe('2026-09-09T04:43:38.697Z')
    expect(r.tags).toEqual(['Engineering', 'Food MarketPlace'])
    expect(r.experience).toBe('2 - 4 years')
    expect(r.description).toContain('Build backend services in Go')
    expect(r.level).toBeUndefined()
  })

  it('links to the posting the way the board encodes its own links', async () => {
    const [r] = await swiggy().fetch(fakeSwiggy().http)
    const url = new URL(r.url)
    expect(url.origin + url.pathname).toBe('https://swiggy.mynexthire.com/employer/jobs/careers')
    expect(url.searchParams.get('src')).toBe('careers')
    const view = JSON.parse(Buffer.from(url.searchParams.get('p'), 'base64').toString('utf8'))
    expect(view).toMatchObject({ pageType: 'jd', cvSource: 'careers', reqId: 28001, page: 'careers', bufilter: -1 })
  })

  it('lists every office a requisition names', async () => {
    const [, s] = await swiggy().fetch(fakeSwiggy().http)
    expect(s.location).toBe('Kolkata / Sumadhura Capitol Towers, India')
  })

  it('passes core normalize and the default filters for an engineering role, not a sales one', async () => {
    const [r, s] = await swiggy().fetch(fakeSwiggy().http)
    const p = normalize(r, 'swiggy')
    expect(p.degreeMin).toBe('bachelors')
    expect(filter(p, RULES)).toBe(true)
    expect(filter(normalize(s, 'swiggy'), RULES)).toBe(false)
  })

  it('returns an empty list for an empty payload', async () => {
    expect(await swiggy().fetch(fakeSwiggy({}).http)).toEqual([])
  })
})

// The one call is every open job, so a posting it stops listing can be
// closed; an empty answer could be an outage, so it never says so.
describe('swiggy list', () => {
  it('is complete when it answers jobs, and not when it answers none', async () => {
    const adapter = swiggy()
    await adapter.fetch(fakeSwiggy().http)
    expect(adapter.complete).toBe(true)
    const empty = swiggy()
    await empty.fetch(fakeSwiggy({}).http)
    expect(empty.complete).toBe(false)
  })
})
