import { describe, it, expect, vi, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from '@jobdekho/server/app.js'
import { createDashboardStore } from '@jobdekho/server/api/store.js'
import { openStore } from '@jobdekho/store/open.js'
import { upsertProfile, getProfile, getResumeText } from '@jobdekho/store/profiles.js'
import { createDocument, getDocument, saveDocumentTex, deleteDocument, listDocuments } from '@jobdekho/store/documents.js'

const config = { sessionSecret: 'test-secret' }
const dirs = []
afterEach(() => { while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true }) })

const PROFILE = {
  basics: { name: 'Jane Doe' }, projects: [{ id: 'p1', title: 'Job tracker', startDate: '2025' }],
  skills: ['react'], resumeText: 'JANE RESUME TEXT', resumeName: 'cv.pdf',
}
const TEX = '\\documentclass{article}\n\\begin{document}\nJane Doe\n\\end{document}\n'
const envelope = (obj) => JSON.stringify({ type: 'result', result: JSON.stringify(obj) })

// One real store in a temp directory behind every handle, so what Apply
// writes is read back exactly as the app would read it.
async function setup(reply) {
  const dir = mkdtempSync(join(tmpdir(), 'jobdekho-chat-apply-'))
  dirs.push(dir)
  const store = openStore(dir)
  await upsertProfile(store, 'u1', PROFILE)
  const doc = await createDocument(store, 'u1', { name: 'Classic resume', kind: 'resume', templateId: 'classic', tex: TEX, by: 'template' })
  const run = vi.fn(async ({ args }) => ({ stdout: args[0] === '--version' ? '2.1.0' : envelope(reply(doc)), stderr: '', code: 0 }))
  const app = buildApp({ config, dashboardStore: createDashboardStore(store) })
  app.decorate('cli', { locate: () => '/usr/local/bin/claude', run, scratch: (work) => work('/scratch') })
  app.decorate('chatStore', store)
  app.decorate('documentStore', store)
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
  const post = (url, body) => app.inject({
    method: 'POST', url, headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { payload: JSON.stringify(body) } : {}),
  })
  const propose = async (page = 'profile') => (await post('/api/chat', { message: 'go', page, documentId: doc.id })).json().proposals[0]
  return { app, store, doc, post, propose }
}

const addProject = () => ({
  reply: 'Here is the project as a change you can apply.',
  proposals: [{ kind: 'profile', summary: 'Add the CLI tool', ops: [{ op: 'add', section: 'projects', position: 'first', entry: { title: 'CLI tool', startDate: '2024', tech: ['Go'] } }] }],
})
const rewrite = (tex) => (doc) => ({ reply: 'Here is a new version.', proposals: [{ kind: 'document', summary: 'Tighter', documentId: doc.id, tex }] })
const TIGHTER = TEX.replace('Jane Doe', '\\small Jane Doe')

describe('applying a profile proposal', () => {
  it('applies only on Apply, from the saved proposal, keeping the uploaded resume', async () => {
    const { store, post, propose } = await setup(addProject)
    const proposal = await propose()
    expect((await getProfile(store, 'u1')).projects).toHaveLength(1)
    const res = await post(`/api/chat/proposals/${proposal.id}/apply`, { ops: [{ op: 'remove', section: 'projects', id: 'p1' }] })
    expect(res.statusCode).toBe(200)
    const { proposal: applied, profile } = res.json()
    expect(applied).toMatchObject({ id: proposal.id, status: 'applied', appliedAt: expect.any(String) })
    expect(profile.projects.map((p) => p.title)).toEqual(['CLI tool', 'Job tracker'])
    expect(await getResumeText(store, 'u1')).toBe('JANE RESUME TEXT')
    expect((await getProfile(store, 'u1')).resumeName).toBe('cv.pdf')
    const history = store.chatHistory.get('u1').turns
    expect(history[0].proposals[0]).toMatchObject({ status: 'applied' })
  })

  it('applies once: a second Apply, or a Discard after it, is refused', async () => {
    const { post, propose, store } = await setup(addProject)
    const { id } = await propose()
    await post(`/api/chat/proposals/${id}/apply`)
    const again = await post(`/api/chat/proposals/${id}/apply`)
    expect(again.statusCode).toBe(409)
    expect(again.json().error).toBe('This change was already applied.')
    expect((await post(`/api/chat/proposals/${id}/discard`)).statusCode).toBe(409)
    expect((await getProfile(store, 'u1')).projects).toHaveLength(2)
  })

  it('refuses, with the sentence saying why, when what it edits changed since, and writes nothing', async () => {
    const { post, propose, store } = await setup(() => ({ reply: 'ok', proposals: [{ kind: 'profile', ops: [{ op: 'update', section: 'projects', id: 'p1', fields: { title: 'Tracker' } }] }] }))
    const { id } = await propose()
    await upsertProfile(store, 'u1', { ...(await getProfile(store, 'u1')), projects: [] })
    const res = await post(`/api/chat/proposals/${id}/apply`)
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toBe('The project "Job tracker" this change edits is no longer in your profile. Nothing was applied; ask again for a fresh change.')
    expect((await getProfile(store, 'u1')).projects).toEqual([])
  })
})

describe('discarding and unknown proposals', () => {
  it('discards, repeatably, and never applies a discarded one', async () => {
    const { post, propose, store } = await setup(addProject)
    const { id } = await propose()
    expect((await post(`/api/chat/proposals/${id}/discard`)).statusCode).toBe(204)
    expect((await post(`/api/chat/proposals/${id}/discard`)).statusCode).toBe(204)
    expect(store.chatHistory.get('u1').turns[0].proposals[0].status).toBe('discarded')
    expect((await post(`/api/chat/proposals/${id}/apply`)).statusCode).toBe(409)
    expect((await getProfile(store, 'u1')).projects).toHaveLength(1)
  })

  it('answers 404 for a proposal no saved turn holds, and 401 without a session', async () => {
    const { app, post } = await setup(addProject)
    expect((await post('/api/chat/proposals/nope/apply')).statusCode).toBe(404)
    expect((await post('/api/chat/proposals/nope/discard')).statusCode).toBe(404)
    expect((await app.inject({ method: 'POST', url: '/api/chat/proposals/nope/apply' })).statusCode).toBe(401)
  })
})

describe('applying a document proposal', () => {
  it('saves the rewrite as a version by the AI', async () => {
    const { post, propose, store, doc } = await setup(rewrite(TIGHTER))
    const { id } = await propose('resume')
    const res = await post(`/api/chat/proposals/${id}/apply`)
    expect(res.statusCode).toBe(200)
    expect(res.json().document).toMatchObject({ id: doc.id, tex: TIGHTER })
    expect(res.json().document.versions.map((v) => v.by)).toEqual(['template', 'ai'])
    expect((await getDocument(store, 'u1', doc.id)).tex).toBe(TIGHTER)
  })

  // Every document route answers with the header notice (see
  // documents/view.js), so a chat change does not hide the offer.
  it('answers the applied rewrite with its header notice', async () => {
    const B = String.fromCharCode(92)
    const header = `${B}resHeader{Jane Roe}{}{}`
    const { post, propose } = await setup(rewrite(TIGHTER.replace('Jane Doe', header)))
    const { id } = await propose('resume')
    const res = await post(`/api/chat/proposals/${id}/apply`)
    expect(res.json().document.profileHeader).toEqual({ fields: ['Name'] })
  })

  it('refuses a rewrite the guard refuses, with its problems, and saves nothing', async () => {
    const { post, propose, store, doc } = await setup(rewrite(TEX.replace('Jane Doe', '\\input{C:/secret}')))
    const { id } = await propose('resume')
    const res = await post(`/api/chat/proposals/${id}/apply`)
    expect(res.statusCode).toBe(422)
    expect(res.json()).toMatchObject({ kind: 'unsafe', problems: ['"\\input" reads files from this computer, so it is not allowed in a document.'] })
    expect((await getDocument(store, 'u1', doc.id)).tex).toBe(TEX)
  })

  it('refuses to undo an edit the person made after the proposal, or to write to a deleted document', async () => {
    const edited = await setup(rewrite(TIGHTER))
    const first = await edited.propose('resume')
    await saveDocumentTex(edited.store, 'u1', edited.doc.id, { tex: `${TEX}% mine\n`, by: 'you' })
    const res = await edited.post(`/api/chat/proposals/${first.id}/apply`)
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toMatch(/^"Classic resume" changed after this was proposed/)

    const gone = await setup(rewrite(TIGHTER))
    const second = await gone.propose('resume')
    await deleteDocument(gone.store, 'u1', gone.doc.id)
    expect((await gone.post(`/api/chat/proposals/${second.id}/apply`)).statusCode).toBe(409)
  })

  it('applies a change asked for as edits, as the whole source it built', async () => {
    const { post, propose, store, doc } = await setup((d) => ({ reply: 'ok', proposals: [{ kind: 'document', documentId: d.id, edits: [{ find: 'Jane Doe', replace: '\\small Jane Doe' }] }] }))
    const { id } = await propose('resume')
    expect((await post(`/api/chat/proposals/${id}/apply`)).statusCode).toBe(200)
    expect((await getDocument(store, 'u1', doc.id)).tex).toBe(TIGHTER)
  })

  it('never applies or discards a change whose edits did not fit, and says why', async () => {
    const { post, propose, store, doc } = await setup((d) => ({ reply: 'ok', proposals: [{ kind: 'document', documentId: d.id, edits: [{ find: 'John Doe', replace: 'x' }] }] }))
    const { id, status, reason } = await propose('resume')
    expect(status).toBe('refused')
    const res = await post(`/api/chat/proposals/${id}/apply`)
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toBe(reason)
    expect((await post(`/api/chat/proposals/${id}/discard`)).statusCode).toBe(409)
    expect((await getDocument(store, 'u1', doc.id)).tex).toBe(TEX)
  })

  it('creates a new document from a proposal for one', async () => {
    const { post, propose, store } = await setup(() => ({ reply: 'A new one.', proposals: [{ kind: 'document', documentId: null, name: 'For startups', documentKind: 'resume', tex: TIGHTER }] }))
    const { id } = await propose('resume')
    const { document } = (await post(`/api/chat/proposals/${id}/apply`)).json()
    expect(document).toMatchObject({ name: 'For startups', kind: 'resume', templateId: null, tex: TIGHTER })
    expect((await listDocuments(store, 'u1')).map((d) => d.name).sort()).toEqual(['Classic resume', 'For startups'])
  })
})
