import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'
import { readNdjson, NDJSON_TYPE } from '@jobdekho/server/ai/events.js'
import { CLAUDE } from '@jobdekho/server/ai/providers.js'

const config = { googleClientId: 'id', googleClientSecret: 'sec', sessionSecret: 'test-secret', baseUrl: 'http://localhost:3000' }

const ROW = { id: 'p1', title: 'Frontend Intern', company: 'Acme', location: 'Pune', level: 'entry', fit: 55, grade: 'B' }

// The full dashboard interface (see apps/server/src/api/store.js), so
// registering every other route ahead of chatRoutes in apiRoutes never trips
// over a method this suite does not itself exercise.
function fakeDashboard({ postings = [ROW], profile = null, open = null } = {}) {
  return {
    listPostingsForUser: vi.fn().mockResolvedValue(postings),
    getPosting: vi.fn().mockResolvedValue(open),
    setPostingStatus: vi.fn(),
    listSources: vi.fn().mockResolvedValue([]),
    listCompanies: vi.fn().mockResolvedValue(['Acme']),
    getProfile: vi.fn().mockResolvedValue(profile),
    getResumeText: vi.fn().mockResolvedValue(null),
    upsertProfile: vi.fn(),
    deleteProfile: vi.fn(),
    getUserFilters: vi.fn().mockResolvedValue(null),
    upsertUserFilters: vi.fn(),
    getAiResult: vi.fn().mockResolvedValue(null),
    setAiResult: vi.fn(),
    listAiResults: vi.fn().mockResolvedValue([]),
    getProviderPref: vi.fn().mockResolvedValue(null),
    upsertProviderPref: vi.fn(),
  }
}

// The same small in-memory shape packages/store/src/user-file.js gives a
// real file: get/set keyed by user id. Good enough for the chat route, which
// only ever touches store.chatHistory.
function fakeChatStore(seed = {}) {
  const data = { ...seed }
  return { chatHistory: { get: (userId) => data[userId] ?? null, set: (userId, record) => { data[userId] = record } } }
}

const NO_CLI = { locate: () => null, run: vi.fn(async () => { throw new Error('a test spawned a CLI') }) }
const cliAnswering = (stdout) => ({
  locate: () => '/usr/local/bin/claude',
  run: vi.fn(async () => ({ stdout, stderr: '', code: 0 })),
  scratch: (work) => work('/scratch'),
})
const envelope = (result, extra = {}) => JSON.stringify({ type: 'result', result, ...extra })
const REPLY = envelope(JSON.stringify({ reply: 'Two of these pay over 20 lakh and are remote.', actions: [{ type: 'sort', value: 'newest' }] }))

async function makeApp({ dashboard = fakeDashboard(), chatStore = fakeChatStore(), cli = NO_CLI } = {}) {
  const app = buildApp({ config, userStore: { upsertUser: vi.fn(), getUserById: vi.fn() }, fetchProfile: vi.fn(), dashboardStore: dashboard })
  app.decorate('cli', cli)
  app.decorate('chatStore', chatStore)
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
  return { app, cookie }
}

async function ask(opts, body, headers = {}) {
  const { app, cookie } = await makeApp(opts)
  const payload = JSON.stringify(body ?? { message: 'which are remote?', filters: {}, sort: 'match' })
  return app.inject({ method: 'POST', url: '/api/chat', payload, headers: { cookie, 'content-type': 'application/json', ...headers } })
}

describe('GET /api/chat/history', () => {
  it('returns 401 without a cookie', async () => {
    const { app } = await makeApp()
    expect((await app.inject({ method: 'GET', url: '/api/chat/history' })).statusCode).toBe(401)
  })

  it('is empty for a person who has not asked anything yet', async () => {
    const { app, cookie } = await makeApp()
    const res = await app.inject({ method: 'GET', url: '/api/chat/history', headers: { cookie } })
    expect(res.json()).toEqual({ id: null, turns: [] })
  })

  // Saved by the single-conversation version: { turns } and nothing else.
  it('reads back what was saved, for this user only, including a conversation saved before ids', async () => {
    const turn = { question: 'Q', answer: 'A', actions: [], provider: 'claude', createdAt: '2026-09-13T00:00:00.000Z' }
    const { app, cookie } = await makeApp({ chatStore: fakeChatStore({ u1: { turns: [turn] } }) })
    const res = await app.inject({ method: 'GET', url: '/api/chat/history', headers: { cookie } })
    expect(res.json()).toEqual({ id: null, turns: [turn] })
  })

  it('no longer deletes the conversation: "Start a new one" files it away instead', async () => {
    const { app, cookie } = await makeApp()
    expect((await app.inject({ method: 'DELETE', url: '/api/chat/history', headers: { cookie } })).statusCode).toBe(404)
  })
})

describe('POST /api/chat', () => {
  it('answers 400 before touching the store when the message is blank', async () => {
    const dashboard = fakeDashboard()
    const res = await ask({ dashboard }, { message: '   ', filters: {}, sort: 'match' })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'Type a question first.' })
    expect(dashboard.getProfile).not.toHaveBeenCalled()
  })

  it('says no CLI is installed, and how to fix that, when neither is (chat honours "none", so both would do)', async () => {
    const res = await ask({})
    expect(res.statusCode).toBe(503)
    expect(res.json().kind).toBe('not_found')
    expect(res.json().error).toContain('Neither Claude Code nor Antigravity is installed')
    expect(res.json().error).toContain('claude.ai/code')
    expect(res.json().error).toContain('antigravity.google')
  })

  it('assembles the context from the store, calls the CLI with no tools, and saves the turn', async () => {
    const dashboard = fakeDashboard()
    const store = fakeChatStore()
    const cli = cliAnswering(REPLY)
    const res = await ask({ dashboard, chatStore: store, cli }, { message: 'which are remote?', filters: { levels: ['entry'] }, sort: 'match', openPostingId: null })
    expect(res.statusCode).toBe(200)
    expect(dashboard.listPostingsForUser).toHaveBeenCalledWith('u1', expect.objectContaining({ levels: ['entry'], sort: 'match' }))
    const call = cli.run.mock.calls.at(-1)[0]
    expect(call.args).toEqual(CLAUDE.promptArgs('none'))
    expect(call.args).toEqual(expect.arrayContaining(['--tools', '']))
    expect(call.timeoutMs).toBe(180000)
    expect(call.input).toContain('which are remote?')
    expect(res.json()).toMatchObject({
      question: 'which are remote?', answer: 'Two of these pay over 20 lakh and are remote.',
      actions: [{ type: 'sort', value: 'newest', label: 'Sort by newest first' }], provider: 'claude',
    })
    const saved = await store.chatHistory.get('u1')
    expect(saved).toEqual({ id: expect.any(String), startedAt: expect.any(String), turns: [res.json()] })
    expect(res.json().conversationId).toBe(saved.id)
  })

  it('never trusts a posting the request body supplies: only the store answers what is on screen', async () => {
    const dashboard = fakeDashboard({ postings: [ROW] })
    const cli = cliAnswering(REPLY)
    const res = await ask({ dashboard, cli }, {
      message: 'what is open?', filters: {}, sort: 'match',
      // A tampered client's own idea of what is on screen; the route never reads it.
      top: [{ id: 'fake', title: 'Invented Role', company: 'Nobody', fit: 100 }],
    })
    expect(res.statusCode).toBe(200)
    expect(dashboard.listPostingsForUser).toHaveBeenCalledWith('u1', expect.anything())
    expect(cli.run.mock.calls.at(-1)[0].input).not.toContain('Invented Role')
    expect(cli.run.mock.calls.at(-1)[0].input).toContain(ROW.title)
  })

  it('answers 422 when the reply has no "reply" field to show', async () => {
    const res = await ask({ cli: cliAnswering(envelope('{"actions":[]}')) })
    expect(res.statusCode).toBe(422)
    expect(res.json().kind).toBe('unreadable')
  })

  it('drops an action the model invents, keeping only the reply', async () => {
    const badAction = envelope(JSON.stringify({ reply: 'Sure.', actions: [{ type: 'delete-everything' }] }))
    const res = await ask({ cli: cliAnswering(badAction) })
    expect(res.statusCode).toBe(200)
    expect(res.json().actions).toEqual([])
  })

  it('keeps only the refs the context carried, worded from the store, and saves them with the turn', async () => {
    const store = fakeChatStore()
    const reply = envelope(JSON.stringify({ reply: 'Acme fits best.', refs: ['p1', 'invented-id', 'p1'] }))
    const res = await ask({ chatStore: store, cli: cliAnswering(reply) })
    expect(res.statusCode).toBe(200)
    expect(res.json().refs).toEqual([{ id: 'p1', title: 'Frontend Intern', company: 'Acme', fit: 55 }])
    expect((await store.chatHistory.get('u1')).turns[0].refs).toEqual(res.json().refs)
  })

  it('carries the scoped posting and what its actions already said into the prompt', async () => {
    const open = { ...ROW, id: 'p9', title: 'Staff Engineer', descriptionText: 'Build things.' }
    const dashboard = fakeDashboard({ open })
    dashboard.listAiResults.mockResolvedValue([{ kind: 'fake-check', postingId: 'p9', result: { verdict: 'suspicious', summary: 'No such office.' } }])
    const cli = cliAnswering(REPLY)
    await ask({ dashboard, cli }, { message: 'is it real?', filters: {}, sort: 'match', openPostingId: 'p9' })
    expect(dashboard.listAiResults).toHaveBeenCalledWith('u1', 'p9')
    const input = cli.run.mock.calls.at(-1)[0].input
    expect(input).toContain('Staff Engineer')
    expect(input).toContain('No such office.')
  })

  it('streams progress and ends on exactly the body a plain caller gets', async () => {
    const plain = await ask({ cli: cliAnswering(REPLY) })
    const streamed = await ask({ cli: cliAnswering(REPLY) }, { message: 'which are remote?', filters: {}, sort: 'match' }, { accept: NDJSON_TYPE })
    expect(streamed.headers['content-type']).toMatch(/application\/x-ndjson/)
    const { events, result } = readNdjson(streamed.body)
    expect(events.map((e) => (e.event === 'start' ? 'start' : e.stage))).toEqual(['start', 'send', 'reply'])
    expect(result).toMatchObject({ answer: plain.json().answer })
  })
})
