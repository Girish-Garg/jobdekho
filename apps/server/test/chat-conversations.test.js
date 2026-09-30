import { describe, it, expect, vi, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from '@jobdekho/server/app.js'
import { createDashboardStore } from '@jobdekho/server/api/store.js'
import { openStore, FILES } from '@jobdekho/store/open.js'
import { upsertProfile } from '@jobdekho/store/profiles.js'

const config = { sessionSecret: 'test-secret' }
const dirs = []
afterEach(() => { while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true }) })

const envelope = (obj) => JSON.stringify({ type: 'result', result: JSON.stringify(obj) })
const ADD = {
  reply: 'Here is the project as a change you can apply.',
  proposals: [{ kind: 'profile', summary: 'Add the CLI tool', ops: [{ op: 'add', section: 'projects', position: 'first', entry: { title: 'CLI tool' } }] }],
}

// Claude Code on PATH, answering every question with `reply`; with `held`
// it answers only once the test lets it, so a question can be caught in
// flight.
function fakeCli(reply, held = false) {
  let release = () => {}
  const gate = held ? new Promise((resolve) => { release = resolve }) : null
  const run = vi.fn(async ({ args }) => {
    if (args[0] === '--version') return { stdout: '2.1.0', stderr: '', code: 0 }
    await gate
    return { stdout: envelope(reply), stderr: '', code: 0 }
  })
  return { cli: { locate: () => '/usr/local/bin/claude', run, scratch: (work) => work('/scratch') }, release, run }
}

async function setup({ reply = ADD, held = false, seed } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'jobdekho-conversations-'))
  dirs.push(dir)
  if (seed) writeFileSync(join(dir, FILES.chatHistory), JSON.stringify(seed))
  const store = openStore(dir)
  await upsertProfile(store, 'u1', { basics: { name: 'Jane' }, projects: [] })
  const fake = fakeCli(reply, held)
  const app = buildApp({ config, dashboardStore: createDashboardStore(store) })
  app.decorate('cli', fake.cli)
  app.decorate('chatStore', store)
  app.decorate('documentStore', store)
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
  const call = async (method, url, body) => app.inject({
    method, url, headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { payload: JSON.stringify(body) } : {}),
  })
  const ask = (message) => call('POST', '/api/chat', { message, page: 'profile' })
  return { app, call, ask, ...fake }
}

const until = async (check) => {
  for (let i = 0; i < 100 && !(await check()); i += 1) await new Promise((resolve) => setTimeout(resolve, 10))
}

describe('the chat\'s past conversations', () => {
  it('needs the session cookie', async () => {
    const { app } = await setup()
    expect((await app.inject({ method: 'GET', url: '/api/chat/conversations' })).statusCode).toBe(401)
    expect((await app.inject({ method: 'GET', url: '/api/chat/made-by-ai' })).statusCode).toBe(401)
  })

  it('files the conversation away on "Start a new one", and opens it again read whole', async () => {
    const { call, ask } = await setup()
    const asked = (await ask('add my CLI tool')).json()
    const res = await call('POST', '/api/chat/conversations')
    expect(res.statusCode).toBe(201)
    const { id, turns, filed } = res.json()
    expect(turns).toEqual([])
    expect(filed).toMatchObject({ id: asked.conversationId, title: 'add my CLI tool', turnCount: 1 })
    expect((await call('GET', '/api/chat/history')).json()).toEqual({ id, turns: [] })
    expect((await call('GET', '/api/chat/conversations')).json()).toEqual({ conversations: [filed] })
    const opened = (await call('GET', `/api/chat/conversations/${filed.id}`)).json()
    expect(opened.turns).toEqual([asked])
    expect((await call('GET', '/api/chat/conversations/nope')).statusCode).toBe(404)
  })

  it('continues a filed conversation as the current one, filing the current one in its place', async () => {
    const { call, ask } = await setup()
    const first = (await ask('first question')).json()
    await call('POST', '/api/chat/conversations')
    await ask('second question')
    const res = await call('POST', `/api/chat/conversations/${first.conversationId}/continue`)
    expect(res.json()).toEqual({ id: first.conversationId, turns: [first] })
    expect((await call('GET', '/api/chat/history')).json().id).toBe(first.conversationId)
    expect((await call('GET', '/api/chat/conversations')).json().conversations.map((c) => c.title)).toEqual(['second question'])
    expect((await call('POST', '/api/chat/conversations/nope/continue')).statusCode).toBe(404)
  })

  it('deletes a filed conversation, once', async () => {
    const { call, ask } = await setup()
    const { conversationId } = (await ask('q')).json()
    await call('POST', '/api/chat/conversations')
    expect((await call('DELETE', `/api/chat/conversations/${conversationId}`)).statusCode).toBe(204)
    expect((await call('DELETE', `/api/chat/conversations/${conversationId}`)).statusCode).toBe(404)
  })

  it('files away a conversation saved before conversations had ids', async () => {
    const legacy = { u1: { turns: [{ question: 'which are remote?', answer: 'Two.', createdAt: '2026-09-01T00:00:00.000Z' }] } }
    const { call } = await setup({ seed: legacy })
    const { filed } = (await call('POST', '/api/chat/conversations')).json()
    expect(filed).toMatchObject({ id: expect.stringMatching(/^[0-9a-f-]{36}$/), title: 'which are remote?', startedAt: '2026-09-01T00:00:00.000Z', turnCount: 1 })
  })

  it('keeps a filed conversation\'s changes appliable', async () => {
    const { call, ask } = await setup()
    const { proposals } = (await ask('add my CLI tool')).json()
    await call('POST', '/api/chat/conversations')
    const applied = await call('POST', `/api/chat/proposals/${proposals[0].id}/apply`, {})
    expect(applied.statusCode).toBe(200)
    expect(applied.json().profile.projects.map((p) => p.title)).toEqual(['CLI tool'])
  })
})

describe('a question in flight when its conversation is filed away', () => {
  it('saves its answer to the conversation it was asked in, and that one cannot be deleted until it lands', async () => {
    const { call, ask, release, run } = await setup({ held: true })
    const answered = ask('add my CLI tool')
    await until(() => run.mock.calls.some(([c]) => c.args[0] !== '--version'))
    const { pending } = (await call('GET', '/api/chat/pending')).json()
    const { id: fresh } = (await call('POST', '/api/chat/conversations')).json()
    expect(pending.conversationId).not.toBe(fresh)
    expect((await call('DELETE', `/api/chat/conversations/${pending.conversationId}`)).statusCode).toBe(409)
    release()
    const turn = (await answered).json()
    expect(turn.conversationId).toBe(pending.conversationId)
    expect((await call('GET', '/api/chat/history')).json()).toEqual({ id: fresh, turns: [] })
    const filed = (await call('GET', `/api/chat/conversations/${pending.conversationId}`)).json()
    expect(filed).toMatchObject({ title: 'add my CLI tool', turnCount: 1, turns: [turn] })
  })
})
