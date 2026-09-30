import { describe, it, expect, vi, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from '@jobdekho/server/app.js'
import { LatexError } from '@jobdekho/server/resume/errors.js'
import { downloadName } from '@jobdekho/server/api/document-files.js'

const config = { sessionSecret: 'test-secret' }

// The small shape packages/store/src/user-file.js gives a real file, so the
// real documents.js runs against it; the PDF cache still uses `dir`, a real
// temp directory, since caching is behaviour under test.
function fakeUserFile() {
  const data = {}
  return { get: (id) => data[id] ?? null, set: (id, record) => { data[id] = record } }
}

const entry = (id, title, bullets) => ({
  id, order: 0, title, organisation: 'Acme', location: '', startDate: '2023', endDate: '', bullets, tech: [], link: '', pinned: false, weight: 0,
})
const PROFILE = {
  basics: { name: 'Jane Doe', headline: '', email: 'jane@example.com', phone: '', location: 'Pune', links: {} },
  experience: [entry('e1', 'Engineer', ['Shipped the portal']), entry('e2', 'Intern', ['Wrote tests'])],
  projects: [], education: [], certifications: [], achievements: [], skillGroups: [],
}
const POSTING = { id: 'p1', title: 'Backend Engineer', company: 'Razorpay', location: 'Bengaluru' }
const PLAN = { sections: { experience: [{ id: 'e1', bullets: ['Built payments APIs in Node'], dropped: [] }] } }

const dirs = []
afterEach(() => { while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true }) })

async function makeApp({ profile = PROFILE, saved = {}, compile } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'jobdekho-documents-test-'))
  dirs.push(dir)
  const dashboardStore = {
    getProfile: vi.fn().mockResolvedValue(profile),
    getPosting: vi.fn(async (_u, id) => (id === POSTING.id ? POSTING : null)),
    getAiResult: vi.fn(async (_u, _p, kind) => (saved[kind] ? { result: saved[kind] } : null)),
  }
  const app = buildApp({ config, dashboardStore })
  app.decorate('documentStore', { dir, documents: fakeUserFile() })
  app.decorate('resumeCompile', compile ?? vi.fn(async () => ({ pdf: Buffer.from('%PDF-fake'), log: '' })))
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
  const call = (method, url, body) => app.inject({
    method, url, headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { payload: JSON.stringify(body) } : {}),
  })
  return { app, call }
}

describe('document templates and auth', () => {
  it('requires a session', async () => {
    const { app } = await makeApp()
    expect((await app.inject({ method: 'GET', url: '/api/documents' })).statusCode).toBe(401)
  })

  it('lists the resume layouts and the letter, each with the kind it makes', async () => {
    const { call } = await makeApp()
    const { templates } = (await call('GET', '/api/documents/templates')).json()
    expect(templates.map((t) => [t.id, t.kind])).toEqual([['classic', 'resume'], ['compact', 'resume'], ['academic', 'resume'], ['letter', 'cover-letter']])
  })
})

describe('POST /api/documents', () => {
  it('makes a resume from a template with no AI call, holding everything in the profile', async () => {
    const { call } = await makeApp()
    const res = await call('POST', '/api/documents', { kind: 'resume', templateId: 'compact' })
    expect(res.statusCode).toBe(201)
    const doc = res.json()
    expect(doc).toMatchObject({ name: 'Compact resume', kind: 'resume', templateId: 'compact', postingId: null })
    expect(doc.tex).toContain('Jane Doe')
    expect(doc.tex).toContain('Shipped the portal')
    expect(doc.tex).toContain('Wrote tests')
    expect(doc.versions).toEqual([{ at: doc.createdAt, by: 'template' }])
  })

  // The plan leads and rewords; it no longer decides what exists. A role it
  // did not pick still follows, as the person wrote it.
  it('makes a tailored resume from the job\'s saved plan: its picks first in its wording, then the rest of the record', async () => {
    const { call } = await makeApp({ saved: { 'resume-tailor': PLAN } })
    const doc = (await call('POST', '/api/documents', { kind: 'resume', templateId: 'classic', postingId: 'p1', fromPlan: true })).json()
    expect(doc).toMatchObject({ name: 'Resume for Backend Engineer at Razorpay', postingId: 'p1' })
    expect(doc.tex).toContain('Built payments APIs in Node')
    expect(doc.tex).not.toContain('Shipped the portal')
    expect(doc.tex.indexOf('Built payments APIs in Node')).toBeLessThan(doc.tex.indexOf('Wrote tests'))
  })

  it('says what to do first when the job has no plan yet, and 404s an unknown job', async () => {
    const { call } = await makeApp()
    const noPlan = await call('POST', '/api/documents', { kind: 'resume', templateId: 'classic', postingId: 'p1', fromPlan: true })
    expect(noPlan.statusCode).toBe(400)
    expect(noPlan.json().error).toBe('Tailor your resume for this job first.')
    expect((await call('POST', '/api/documents', { kind: 'resume', templateId: 'classic', postingId: 'nope' })).statusCode).toBe(404)
  })

  it('makes a cover letter from the job\'s saved letter, escaped, on the letter template', async () => {
    const { call } = await makeApp({ saved: { 'cover-letter': { letter: 'Dear Hiring Team at Razorpay,\n\nI cut costs 40% at R&D.\n\nRegards,\nJane' } } })
    const doc = (await call('POST', '/api/documents', { kind: 'cover-letter', postingId: 'p1' })).json()
    expect(doc).toMatchObject({ name: 'Cover letter for Backend Engineer at Razorpay', kind: 'cover-letter', templateId: 'letter' })
    expect(doc.tex).toContain('I cut costs 40\\% at R\\&D.')
    expect(doc.tex).toContain('Hiring Team\\newline Razorpay\\newline Bengaluru')
  })

  // The chat's card lets a person edit the letter before making it a
  // document; those words win over the saved ones, escaped the same way.
  it('makes the letter from the words the person sends, over the saved ones, escaped', async () => {
    const { call } = await makeApp({ saved: { 'cover-letter': { letter: 'The saved words.' } } })
    const doc = (await call('POST', '/api/documents', { kind: 'cover-letter', postingId: 'p1', text: 'My own edit: 100% & more.\n\nRegards,\nJane' })).json()
    expect(doc.tex).toContain('My own edit: 100\\% \\& more.')
    expect(doc.tex).not.toContain('The saved words.')
    const blank = (await call('POST', '/api/documents', { kind: 'cover-letter', postingId: 'p1', text: '   ' })).json()
    expect(blank.tex).toContain('The saved words.')
  })

  it('starts a letter with a placeholder when there is no saved letter, and a resume even with no profile', async () => {
    const { call } = await makeApp({ profile: null })
    expect((await call('POST', '/api/documents', { kind: 'cover-letter' })).json().tex).toContain('ask the chat to draft it')
    expect((await call('POST', '/api/documents', { kind: 'resume', templateId: 'classic' })).json().tex).toContain('Your Name')
  })

  it('keeps a name the person gave, and refuses an unknown kind or template', async () => {
    const { call } = await makeApp()
    expect((await call('POST', '/api/documents', { kind: 'resume', templateId: 'classic', name: 'For startups' })).json().name).toBe('For startups')
    expect((await call('POST', '/api/documents', { kind: 'poem' })).statusCode).toBe(400)
    expect((await call('POST', '/api/documents', { kind: 'resume', templateId: 'letter' })).statusCode).toBe(400)
    expect((await call('POST', '/api/documents', { kind: 'cover-letter', templateId: 'classic' })).statusCode).toBe(400)
  })
})

describe('reading, editing and restoring a document', () => {
  it('lists without bodies, and opens with the history as times and authors', async () => {
    const { call } = await makeApp()
    const doc = (await call('POST', '/api/documents', { kind: 'resume', templateId: 'classic' })).json()
    const { documents } = (await call('GET', '/api/documents')).json()
    expect(documents).toEqual([expect.objectContaining({ id: doc.id, name: 'Classic resume' })])
    expect(documents[0]).not.toHaveProperty('tex')
    const opened = (await call('GET', `/api/documents/${doc.id}`)).json()
    expect(opened.tex).toBe(doc.tex)
    expect(opened.versions[0]).not.toHaveProperty('tex')
    expect((await call('GET', `/api/documents/${doc.id}?bodies=1`)).json().versions[0].tex).toBe(doc.tex)
    expect((await call('GET', '/api/documents/nope')).statusCode).toBe(404)
  })

  it('saves the person\'s edit as a version by "you", even one the guard would refuse', async () => {
    const { call } = await makeApp()
    const doc = (await call('POST', '/api/documents', { kind: 'resume', templateId: 'classic' })).json()
    const edited = (await call('PUT', `/api/documents/${doc.id}`, { tex: '\\input{half typed', name: 'Mine' })).json()
    expect(edited).toMatchObject({ name: 'Mine', tex: '\\input{half typed' })
    expect(edited.versions.map((v) => v.by)).toEqual(['template', 'you'])
    expect((await call('PUT', `/api/documents/${doc.id}`, { tex: '  ' })).statusCode).toBe(400)
    expect((await call('PUT', '/api/documents/nope', { tex: 'x' })).statusCode).toBe(404)
  })

  it('restores an old version as the newest, and 404s one no longer kept', async () => {
    const { call } = await makeApp()
    const doc = (await call('POST', '/api/documents', { kind: 'resume', templateId: 'classic' })).json()
    await call('PUT', `/api/documents/${doc.id}`, { tex: 'changed' })
    const restored = (await call('POST', `/api/documents/${doc.id}/revert`, { at: doc.versions[0].at })).json()
    expect(restored.tex).toBe(doc.tex)
    expect(restored.versions.at(-1)).toMatchObject({ by: 'you', restoredFrom: doc.versions[0].at })
    expect((await call('POST', `/api/documents/${doc.id}/revert`, { at: 'never' })).statusCode).toBe(404)
  })

  it('deletes a document, once', async () => {
    const { call } = await makeApp()
    const doc = (await call('POST', '/api/documents', { kind: 'resume', templateId: 'classic' })).json()
    expect((await call('DELETE', `/api/documents/${doc.id}`)).statusCode).toBe(204)
    expect((await call('DELETE', `/api/documents/${doc.id}`)).statusCode).toBe(404)
  })
})

describe('POST /api/documents/:id/pdf', () => {
  it('refuses to compile a document the guard refuses, and says why, line by line', async () => {
    const { app, call } = await makeApp()
    const doc = (await call('POST', '/api/documents', { kind: 'resume', templateId: 'classic' })).json()
    await call('PUT', `/api/documents/${doc.id}`, { tex: doc.tex.replace('\\begin{document}', '\\begin{document}\\input{C:/Users/me/.ssh/id_rsa}') })
    const res = await call('POST', `/api/documents/${doc.id}/pdf`)
    expect(res.statusCode).toBe(422)
    expect(res.json()).toMatchObject({ kind: 'unsafe', problems: ['"\\input" reads files from this computer, so it is not allowed in a document.'] })
    expect(app.resumeCompile).not.toHaveBeenCalled()
  })

  it('compiles a clean document once, then serves the cached PDF', async () => {
    const { app, call } = await makeApp()
    const doc = (await call('POST', '/api/documents', { kind: 'resume', templateId: 'classic' })).json()
    for (let i = 0; i < 2; i += 1) {
      const res = await call('POST', `/api/documents/${doc.id}/pdf`)
      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toBe('application/pdf')
      expect(res.body).toBe('%PDF-fake')
    }
    expect(app.resumeCompile).toHaveBeenCalledTimes(1)
    expect(app.resumeCompile).toHaveBeenCalledWith(doc.tex)
  })

  it('names the line pdflatex stopped on, and passes the other failures through with their kind', async () => {
    const log = 'This is pdfTeX\n! Undefined control sequence.\nl.12 \\resFoo\n'
    const failing = vi.fn(async () => { throw new LatexError('compile_failed', '', log) })
    const { call } = await makeApp({ compile: failing })
    const doc = (await call('POST', '/api/documents', { kind: 'resume', templateId: 'classic' })).json()
    const res = await call('POST', `/api/documents/${doc.id}/pdf`)
    expect(res.statusCode).toBe(422)
    expect(res.json().kind).toBe('compile_failed')
    expect(res.json().error).toMatch(/^The document did not compile: ! Undefined control sequence\./)

    const missing = await makeApp({ compile: vi.fn(async () => { throw new LatexError('not_found') }) })
    const other = (await missing.call('POST', '/api/documents', { kind: 'resume', templateId: 'classic' })).json()
    const res2 = await missing.call('POST', `/api/documents/${other.id}/pdf`)
    expect(res2.statusCode).toBe(503)
    expect(res2.json()).toMatchObject({ kind: 'not_found', error: expect.stringMatching(/miktex\.org/) })
  })
})

describe('GET /api/documents/:id/tex', () => {
  it('downloads the source under a file name safe for the header', async () => {
    const { call } = await makeApp()
    const doc = (await call('POST', '/api/documents', { kind: 'resume', templateId: 'classic', name: 'Resume for "SDE" at R&D\r\nX-Evil: 1' })).json()
    const res = await call('GET', `/api/documents/${doc.id}/tex`)
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-disposition']).toBe('attachment; filename="Resume-for-SDE-at-RD-X-Evil-1.tex"')
    expect(res.body).toBe(doc.tex)
  })

  it('never lets a name become a hidden or empty file name', () => {
    expect(downloadName('...')).toBe('document')
    expect(downloadName('../../etc/passwd')).toBe('etcpasswd')
  })
})
