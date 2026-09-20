import { describe, it, expect, vi, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from '@jobdekho/server/app.js'
import { LatexError } from '@jobdekho/server/resume/errors.js'

const config = { sessionSecret: 'test-secret' }

// A minimal stand-in for packages/store/src/user-file.js: enough for
// resume-selections.js to read and write against, with nothing touching
// real disk for the selection itself (the PDF cache still uses `dir`, a
// real temp directory, since caching is the behaviour under test).
function fakeUserFile() {
  const data = {}
  return { get: (id) => data[id] ?? null, set: (id, record) => { data[id] = record } }
}

const PROFILE = {
  basics: { name: 'Jane Doe', headline: '', email: '', phone: '', location: '', links: {} },
  experience: [{
    id: 'e1', order: 0, title: 'Engineer', organisation: 'Acme', location: '',
    startDate: '2022', endDate: '', bullets: ['Shipped stuff'], tech: [], link: '', pinned: false, weight: 0,
  }],
  projects: [], education: [], certifications: [], achievements: [], skillGroups: [],
}

const EMPTY_PROFILE = {
  basics: { name: '', headline: '', email: '', phone: '', location: '', links: {} },
  experience: [], projects: [], education: [], certifications: [], achievements: [], skillGroups: [],
}

const dirs = []
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true })
})

async function makeApp({ profile = PROFILE, compile } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'jobdekho-resume-routes-test-'))
  dirs.push(dir)
  const dashboardStore = { getProfile: vi.fn().mockResolvedValue(profile) }
  const app = buildApp({ config, dashboardStore })
  // Real LaTeX never runs in this suite: the compile step is injected, the
  // same seam the routes fall back to a real compileTex without (see
  // apps/server/src/api/resume.js).
  app.decorate('resumeStore', { dir, resumeSelections: fakeUserFile() })
  app.decorate('resumeCompile', compile ?? vi.fn(async () => ({ pdf: Buffer.from('%PDF-fake'), log: '' })))
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
  return { app, cookie }
}

describe('GET /api/resume/templates', () => {
  it('lists the three built-in templates', async () => {
    const { app, cookie } = await makeApp()
    const res = await app.inject({ method: 'GET', url: '/api/resume/templates', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    expect(res.json().templates.map((t) => t.id)).toEqual(['classic', 'compact', 'academic'])
  })

  it('requires auth', async () => {
    const { app } = await makeApp()
    expect((await app.inject({ method: 'GET', url: '/api/resume/templates' })).statusCode).toBe(401)
  })
})

describe('resume selection', () => {
  it('defaults to the classic template with no section chosen yet', async () => {
    const { app, cookie } = await makeApp()
    const res = await app.inject({ method: 'GET', url: '/api/resume/selection', headers: { cookie } })
    expect(res.json()).toEqual({ template: 'classic', sections: {} })
  })

  it('saves and reads back a choice of template and entries', async () => {
    const { app, cookie } = await makeApp()
    const body = JSON.stringify({ template: 'compact', sections: { experience: ['e1'] } })
    const put = await app.inject({ method: 'PUT', url: '/api/resume/selection', headers: { cookie, 'content-type': 'application/json' }, body })
    expect(put.json()).toEqual({ template: 'compact', sections: { experience: ['e1'] } })
    const get = await app.inject({ method: 'GET', url: '/api/resume/selection', headers: { cookie } })
    expect(get.json()).toEqual({ template: 'compact', sections: { experience: ['e1'] } })
  })
})

const bodyOf = (obj) => ({ headers: { 'content-type': 'application/json' }, body: JSON.stringify(obj) })

describe('POST /api/resume/tex', () => {
  it('never needs LaTeX: returns the .tex source as plain text', async () => {
    const { app, cookie } = await makeApp()
    const res = await app.inject({
      method: 'POST', url: '/api/resume/tex', headers: { cookie, ...bodyOf({ template: 'classic', sections: {} }).headers },
      body: bodyOf({ template: 'classic', sections: {} }).body,
    })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/plain/)
    expect(res.body).toContain('Engineer')
    expect(app.resumeCompile).not.toHaveBeenCalled()
  })

  it('answers 400 with what to do first for an empty profile', async () => {
    const { app, cookie } = await makeApp({ profile: EMPTY_PROFILE })
    const res = await app.inject({ method: 'POST', url: '/api/resume/tex', headers: { cookie, ...bodyOf({ template: 'classic' }).headers }, body: bodyOf({ template: 'classic' }).body })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/nothing in it yet/)
  })

  it('answers 400 for an unknown template', async () => {
    const { app, cookie } = await makeApp()
    const res = await app.inject({ method: 'POST', url: '/api/resume/tex', headers: { cookie, ...bodyOf({ template: 'nope' }).headers }, body: bodyOf({ template: 'nope' }).body })
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/resume/tex with a tailoring plan', () => {
  const plan = { sections: { experience: [{ id: 'e1', bullets: ['Reworded bullet for this job.'], dropped: ['Shipped stuff'] }] } }

  it('swaps in the plan\'s reworded bullets without touching the stored profile', async () => {
    const { app, cookie } = await makeApp()
    const res = await app.inject({
      method: 'POST', url: '/api/resume/tex',
      headers: { cookie, ...bodyOf({ template: 'classic', sections: {}, plan }).headers },
      body: bodyOf({ template: 'classic', sections: {}, plan }).body,
    })
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('Reworded bullet for this job')
    expect(res.body).not.toContain('Shipped stuff')
  })

  it('still lets `sections` pick and order entries the plan did not mention', async () => {
    const { app, cookie } = await makeApp({ profile: { ...PROFILE, experience: [...PROFILE.experience, {
      id: 'e2', order: 1, title: 'Other role', organisation: 'Other Co', location: '',
      startDate: '2020', endDate: '2021', bullets: ['Did other things'], tech: [], link: '', pinned: false, weight: 0,
    }] } })
    const res = await app.inject({
      method: 'POST', url: '/api/resume/tex',
      headers: { cookie, ...bodyOf({ template: 'classic', sections: { experience: ['e2'] }, plan }).headers },
      body: bodyOf({ template: 'classic', sections: { experience: ['e2'] }, plan }).body,
    })
    expect(res.body).toContain('Did other things')
    expect(res.body).not.toContain('Reworded bullet for this job')
  })
})

describe('POST /api/resume/pdf', () => {
  it('returns the compiled PDF bytes', async () => {
    const { app, cookie } = await makeApp()
    const res = await app.inject({ method: 'POST', url: '/api/resume/pdf', headers: { cookie, ...bodyOf({ template: 'classic', sections: {} }).headers }, body: bodyOf({ template: 'classic', sections: {} }).body })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toMatch(/application\/pdf/)
    expect(res.rawPayload.toString()).toBe('%PDF-fake')
  })

  it('serves the second request for the same selection from the cache, without compiling again', async () => {
    const { app, cookie } = await makeApp()
    const req = () => app.inject({ method: 'POST', url: '/api/resume/pdf', headers: { cookie, ...bodyOf({ template: 'classic', sections: {} }).headers }, body: bodyOf({ template: 'classic', sections: {} }).body })
    await req()
    await req()
    expect(app.resumeCompile).toHaveBeenCalledTimes(1)
  })

  it('compiles again once the selection actually changes', async () => {
    const { app, cookie } = await makeApp()
    await app.inject({ method: 'POST', url: '/api/resume/pdf', headers: { cookie, ...bodyOf({ template: 'classic', sections: {} }).headers }, body: bodyOf({ template: 'classic', sections: {} }).body })
    await app.inject({ method: 'POST', url: '/api/resume/pdf', headers: { cookie, ...bodyOf({ template: 'compact', sections: {} }).headers }, body: bodyOf({ template: 'compact', sections: {} }).body })
    expect(app.resumeCompile).toHaveBeenCalledTimes(2)
  })

  it('answers 400 for an empty profile without ever compiling', async () => {
    const { app, cookie } = await makeApp({ profile: EMPTY_PROFILE })
    const res = await app.inject({ method: 'POST', url: '/api/resume/pdf', headers: { cookie, ...bodyOf({ template: 'classic' }).headers }, body: bodyOf({ template: 'classic' }).body })
    expect(res.statusCode).toBe(400)
    expect(app.resumeCompile).not.toHaveBeenCalled()
  })

  // The no-LaTeX-installed case: written for the person at the browser, and
  // the status a UI can act on without parsing the sentence.
  it('answers 503 with the install sentence when no LaTeX is on this machine', async () => {
    const compile = vi.fn(async () => { throw new LatexError('not_found') })
    const { app, cookie } = await makeApp({ compile })
    const res = await app.inject({ method: 'POST', url: '/api/resume/pdf', headers: { cookie, ...bodyOf({ template: 'classic' }).headers }, body: bodyOf({ template: 'classic' }).body })
    expect(res.statusCode).toBe(503)
    expect(res.json().kind).toBe('not_found')
    expect(res.json().error).toMatch(/miktex\.org/)
  })

  it('compiles again once a tailoring plan changes the bullets, since the cache key is the rendered .tex', async () => {
    const { app, cookie } = await makeApp()
    const plan = { sections: { experience: [{ id: 'e1', bullets: ['Reworded bullet.'], dropped: [] }] } }
    const req = (withPlan) => app.inject({
      method: 'POST', url: '/api/resume/pdf',
      headers: { cookie, ...bodyOf({ template: 'classic', sections: {}, ...(withPlan ? { plan } : {}) }).headers },
      body: bodyOf({ template: 'classic', sections: {}, ...(withPlan ? { plan } : {}) }).body,
    })
    await req(false)
    await req(true)
    expect(app.resumeCompile).toHaveBeenCalledTimes(2)
  })

  it('answers 422 with the log excerpt when the document fails to compile', async () => {
    const compile = vi.fn(async () => { throw new LatexError('compile_failed', '! Undefined control sequence.') })
    const { app, cookie } = await makeApp({ compile })
    const res = await app.inject({ method: 'POST', url: '/api/resume/pdf', headers: { cookie, ...bodyOf({ template: 'classic' }).headers }, body: bodyOf({ template: 'classic' }).body })
    expect(res.statusCode).toBe(422)
    expect(res.json().error).toMatch(/Undefined control sequence/)
    expect(res.json().error).toMatch(/Download the \.tex file/)
  })
})
