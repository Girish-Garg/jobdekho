import { describe, it, expect, vi, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from '@jobdekho/server/app.js'
import { renderTex } from '@jobdekho/server/resume/render.js'

const config = { sessionSecret: 'test-secret' }
const B = String.fromCharCode(92)

// The same small user-file shape documents-routes.test.js runs the real
// documents.js against.
function fakeUserFile() {
  const data = {}
  return { get: (id) => data[id] ?? null, set: (id, record) => { data[id] = record } }
}

const BASICS = { name: 'Asha Rao', headline: 'Backend Engineer', email: 'demo@example.com', phone: '', location: 'Pune', links: { github: 'github.com/asharao' } }
const PROFILE = {
  basics: BASICS,
  experience: [{ id: 'e1', order: 0, title: 'Engineer', organisation: 'Acme', location: '', startDate: '2023', endDate: '', bullets: ['Shipped the portal'], tech: [], link: '', pinned: false, weight: 0 }],
  projects: [], education: [], certifications: [], achievements: [], skillGroups: [],
}
const withBasics = (over) => ({ ...PROFILE, basics: { ...BASICS, ...over } })

const dirs = []
afterEach(() => { while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true }) })

// `profile.set` stands in for the person saving their Profile page between
// two requests.
async function makeApp({ profile = PROFILE } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'jobdekho-profile-header-test-'))
  dirs.push(dir)
  let current = profile
  const dashboardStore = { getProfile: vi.fn(async () => current), getPosting: vi.fn(async () => null), getAiResult: vi.fn(async () => null) }
  const app = buildApp({ config, dashboardStore })
  const documents = fakeUserFile()
  app.decorate('documentStore', { dir, documents })
  app.decorate('resumeCompile', vi.fn(async () => ({ pdf: Buffer.from('%PDF-fake'), log: '' })))
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'demo@example.com', name: 'Asha', avatarUrl: null })}`
  const call = (method, url, body) => app.inject({
    method, url, headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { payload: JSON.stringify(body) } : {}),
  })
  const header = (id, action) => call('POST', `/api/documents/${id}/profile-header`, { action })
  const stored = (id) => documents.get('u1').documents.find((doc) => doc.id === id)
  return { call, header, stored, profile: { set: (next) => { current = next } } }
}

const newResume = async (call) => (await call('POST', '/api/documents', { kind: 'resume', templateId: 'classic' })).json()

describe('the profile header notice on a document', () => {
  it('says nothing for a document made from the current profile, or with no profile at all', async () => {
    const { call } = await makeApp()
    const doc = await newResume(call)
    expect((await call('GET', `/api/documents/${doc.id}`)).json().profileHeader).toBeNull()
    const empty = await makeApp({ profile: null })
    const blank = await newResume(empty.call)
    expect((await empty.call('GET', `/api/documents/${blank.id}`)).json().profileHeader).toBeNull()
  })

  it('names the parts of the header the profile now writes differently, on reads, saves and restores', async () => {
    const { call, profile } = await makeApp()
    const doc = await newResume(call)
    profile.set(withBasics({ name: 'Asha Menon', email: 'menon@example.com' }))
    expect((await call('GET', `/api/documents/${doc.id}`)).json().profileHeader).toEqual({ fields: ['Name', 'Contact line'] })
    const saved = (await call('PUT', `/api/documents/${doc.id}`, { tex: doc.tex.replace('Shipped', 'Built') })).json()
    expect(saved.profileHeader).toEqual({ fields: ['Name', 'Contact line'] })
    const restored = (await call('POST', `/api/documents/${doc.id}/revert`, { at: doc.versions[0].at })).json()
    expect(restored.profileHeader).toEqual({ fields: ['Name', 'Contact line'] })
  })

  it('says nothing once the person deleted the header call', async () => {
    const { call, profile } = await makeApp()
    const doc = await newResume(call)
    const own = doc.tex.split('\n').filter((line) => !line.startsWith(`${B}resHeader{`)).join('\n')
    await call('PUT', `/api/documents/${doc.id}`, { tex: own })
    profile.set(withBasics({ name: 'Asha Menon' }))
    expect((await call('GET', `/api/documents/${doc.id}`)).json().profileHeader).toBeNull()
  })
})

describe('POST /api/documents/:id/profile-header', () => {
  it('previews the new source without saving anything', async () => {
    const { call, header, profile } = await makeApp()
    const doc = await newResume(call)
    profile.set(withBasics({ headline: 'Staff Engineer' }))
    const res = await header(doc.id, 'preview')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ fields: ['Headline'], tex: renderTex('classic', withBasics({ headline: 'Staff Engineer' }), {}) })
    const after = (await call('GET', `/api/documents/${doc.id}`)).json()
    expect(after.tex).toBe(doc.tex)
    expect(after.versions).toHaveLength(1)
  })

  it('applies only the header, as a version by the profile, and the notice goes', async () => {
    const { call, header, profile } = await makeApp()
    const doc = await newResume(call)
    const edited = (await call('PUT', `/api/documents/${doc.id}`, { tex: doc.tex.replace('Shipped the portal', 'Shipped the portal % mine') })).json()
    profile.set(withBasics({ name: 'Asha Menon' }))
    const applied = (await header(doc.id, 'apply')).json()
    expect(applied.tex).toBe(edited.tex.replace(`${B}resHeader{Asha Rao}`, `${B}resHeader{Asha Menon}`))
    expect(applied.versions.map((v) => v.by)).toEqual(['template', 'you', 'profile'])
    expect(applied.versions[0]).not.toHaveProperty('tex')
    expect(applied.profileHeader).toBeNull()
    expect((await call('GET', `/api/documents/${doc.id}`)).json().profileHeader).toBeNull()
  })

  it('keeps the person\'s header until the profile changes again', async () => {
    const { call, header, stored, profile } = await makeApp()
    const doc = await newResume(call)
    profile.set(withBasics({ name: 'Asha Menon' }))
    const kept = (await header(doc.id, 'keep')).json()
    expect(kept.profileHeader).toBeNull()
    expect(kept).not.toHaveProperty('headerKept')
    expect(kept.tex).toBe(doc.tex)
    expect(kept.versions).toHaveLength(1)
    expect((await call('GET', `/api/documents/${doc.id}`)).json().profileHeader).toBeNull()
    profile.set(withBasics({ name: 'Asha Menon', phone: '+91 98000 00000' }))
    expect((await call('GET', `/api/documents/${doc.id}`)).json().profileHeader).toEqual({ fields: ['Name', 'Contact line'] })
    await header(doc.id, 'apply')
    expect(stored(doc.id)).not.toHaveProperty('headerKept')
  })

  it('updates a cover letter\'s header', async () => {
    const { call, header, profile } = await makeApp()
    const doc = (await call('POST', '/api/documents', { kind: 'cover-letter' })).json()
    profile.set(withBasics({ location: 'Bengaluru' }))
    expect((await call('GET', `/api/documents/${doc.id}`)).json().profileHeader).toEqual({ fields: ['Contact line'] })
    const applied = (await header(doc.id, 'apply')).json()
    expect(applied.tex).toContain(`${B}letterHeader{Asha Rao}{Bengaluru | demo@example.com`)
    expect(applied.versions.at(-1).by).toBe('profile')
  })

  it('404s an unknown document, 400s an unknown action, and 409s when there is nothing to update', async () => {
    const { call, header } = await makeApp()
    const doc = await newResume(call)
    const missing = await header('nope', 'apply')
    expect(missing.statusCode).toBe(404)
    expect(missing.json().error).toBe('That document is not there any more.')
    expect((await header(doc.id, 'overwrite')).statusCode).toBe(400)
    expect((await call('POST', `/api/documents/${doc.id}/profile-header`)).statusCode).toBe(400)
    for (const action of ['preview', 'apply', 'keep']) {
      const res = await header(doc.id, action)
      expect(res.statusCode).toBe(409)
      expect(res.json().error).toMatch(/^Nothing to update/)
    }
  })
})
