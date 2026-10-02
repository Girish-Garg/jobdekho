import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from '@jobdekho/server/app.js'
import { createDashboardStore } from '@jobdekho/server/api/store.js'
import { openStore, FILES } from '@jobdekho/store/open.js'

// A temporary data folder and a sources config of the test's own: nothing
// here reads the real data folder or the repo's config/companies.json.
let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-blocked-routes-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const SOURCES = { providers: [{ provider: 'greenhouse', slug: 'acmefoundation', company: 'Acme Foundation' }], companies: ['hdfcbank'], boards: ['internshala'] }

async function makeApp({ devUserId = 'local' } = {}) {
  const store = openStore(dir)
  const app = buildApp({ config: { sessionSecret: 'test-secret', devUserId }, dashboardStore: createDashboardStore(store) })
  app.decorate('sourcesConfig', SOURCES)
  await app.ready()
  const call = (method, url, payload) => app.inject({ method, url, payload })
  return { store, call }
}

const fileOf = () => JSON.parse(readFileSync(join(dir, FILES.blockedCompanies), 'utf8'))

describe('/api/companies/blocked', () => {
  it('answers 401 without an identity, to every method', async () => {
    const { call } = await makeApp({ devUserId: null })
    expect((await call('GET', '/api/companies/blocked')).statusCode).toBe(401)
    expect((await call('POST', '/api/companies/blocked', { name: 'Acme' })).statusCode).toBe(401)
    expect((await call('DELETE', '/api/companies/blocked/acme')).statusCode).toBe(401)
    expect((await call('GET', '/api/companies/careers-page?name=Acme')).statusCode).toBe(401)
  })

  it('lists nothing on a fresh install', async () => {
    const { call } = await makeApp()
    expect((await call('GET', '/api/companies/blocked')).json()).toEqual({ blocked: [] })
  })

  it('blocks a company with the careers page choice, says whether it has a page, and lists it', async () => {
    const { call } = await makeApp()
    const res = await call('POST', '/api/companies/blocked', { name: 'Acme Foundation Pvt Ltd', stopFetching: true })
    expect(res.statusCode).toBe(200)
    const entry = { key: 'acmefoundation', name: 'Acme Foundation Pvt Ltd', blockedAt: expect.any(String), stopFetching: true, careersPage: true }
    expect(res.json()).toEqual({ blocked: entry })
    expect((await call('GET', '/api/companies/blocked')).json()).toEqual({ blocked: [entry] })
    expect(fileOf().local).toHaveLength(1)
  })

  // A company only job boards carry has no page of its own; the block still
  // takes, and stopFetching defaults to off.
  it('blocks a company that only job boards carry, or none carries yet', async () => {
    const { call } = await makeApp()
    const res = await call('POST', '/api/companies/blocked', { name: 'Nowhere Yet' })
    expect(res.json().blocked).toMatchObject({ key: 'nowhereyet', stopFetching: false, careersPage: false })
  })

  it('refuses a body without a usable name, in Fastify\'s words or its own', async () => {
    const { call } = await makeApp()
    for (const body of [{}, { name: '' }, { name: 'Acme', stopFetching: 'please' }, { name: 'x'.repeat(201) }]) {
      expect((await call('POST', '/api/companies/blocked', body)).statusCode, JSON.stringify(body)).toBe(400)
    }
    const noKey = await call('POST', '/api/companies/blocked', { name: '...' })
    expect(noKey.statusCode).toBe(400)
    expect(noKey.json().error).toMatch(/letters or digits/)
    expect((await call('GET', '/api/companies/blocked')).json()).toEqual({ blocked: [] })
  })

  it('unblocks by the key the list gave, and answers 404 for one not blocked', async () => {
    const { call } = await makeApp()
    await call('POST', '/api/companies/blocked', { name: 'Acme Foundation' })
    expect((await call('DELETE', '/api/companies/blocked/acmefoundation')).statusCode).toBe(204)
    expect((await call('GET', '/api/companies/blocked')).json()).toEqual({ blocked: [] })
    const again = await call('DELETE', '/api/companies/blocked/acmefoundation')
    expect(again.statusCode).toBe(404)
    expect(again.json()).toEqual({ error: 'That company is not blocked.' })
  })

  // The feed reads the same store, so a block reaches it at once.
  it('takes the company out of the feed and the company menu', async () => {
    const { store, call } = await makeApp()
    const row = (id, company) => ({ id, source: 'internshala', company, title: 'Software Engineer', tags: [], descriptionSnippet: '', lastSeenAt: null, level: 'mid' })
    store.corpus.save(new Map([['a', row('a', 'ACME FOUNDATION')], ['b', row('b', 'Beta')]]))
    await call('POST', '/api/companies/blocked', { name: 'Acme Foundation' })
    const feed = (await call('GET', '/api/postings?sort=newest&companies=Acme%20Foundation')).json()
    expect(feed).toMatchObject({ postings: [], total: 0, blockedPicks: ['Acme Foundation'] })
    expect((await call('GET', '/api/postings?sort=newest')).json().postings.map((p) => p.id)).toEqual(['b'])
    expect((await call('GET', '/api/companies')).json().companies.map((c) => c.name)).toEqual(['Beta'])
  })
})

describe('GET /api/companies/careers-page', () => {
  it('says whether the company has a careers source of its own, by any spelling', async () => {
    const { call } = await makeApp()
    const ask = async (name) => (await call('GET', `/api/companies/careers-page?name=${encodeURIComponent(name)}`)).json()
    expect(await ask('ACME FOUNDATION PRIVATE LIMITED')).toEqual({ careersPage: true })
    expect(await ask('HDFC Bank')).toEqual({ careersPage: true })
    expect(await ask('Internshala')).toEqual({ careersPage: false })
    expect(await ask('Gamma')).toEqual({ careersPage: false })
    expect((await call('GET', '/api/companies/careers-page')).json()).toEqual({ careersPage: false })
  })
})
