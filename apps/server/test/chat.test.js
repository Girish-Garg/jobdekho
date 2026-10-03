import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'
import { readNdjson, NDJSON_TYPE } from '@jobdekho/server/ai/events.js'
import { CLAUDE } from '@jobdekho/server/ai/providers.js'
import { memoryChatStore } from './fixtures/chat-store.js'

const config = { googleClientId: 'id', googleClientSecret: 'sec', sessionSecret: 'test-secret', baseUrl: 'http://localhost:3000' }

const ROW = { id: 'p1', title: 'Frontend Intern', company: 'Acme', location: 'Pune', level: 'entry', fit: 55, grade: 'B' }

// The full dashboard interface (see apps/server/src/api/store.js), so
// registering every other route ahead of the chat's never trips over a
// method this suite does not itself exercise.
function fakeDashboard({ postings = [ROW], profile = null, open = null } = {}) {
  return {
    listPostingsForUser: vi.fn().mockResolvedValue(postings),
    getPosting: vi.fn(async (_u, id) => (open && id === open.id ? open : null)),
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

const NO_CLI = { locate: () => null, run: vi.fn(async () => { throw new Error('a test spawned a CLI') }) }
const cliAnswering = (stdout) => ({
  locate: () => '/usr/local/bin/claude',
  run: vi.fn(async () => ({ stdout, stderr: '', code: 0 })),
  scratch: (work) => work('/scratch'),
})
const envelope = (result, extra = {}) => JSON.stringify({ type: 'result', result, ...extra })
const REPLY = envelope(JSON.stringify({ reply: 'Two of these pay over 20 lakh and are remote.', actions: [{ type: 'sort', value: 'newest' }] }))

async function makeApp({ dashboard = fakeDashboard(), chatStore = memoryChatStore(), cli = NO_CLI } = {}) {
  const app = buildApp({ config, userStore: { upsertUser: vi.fn(), getUserById: vi.fn() }, fetchProfile: vi.fn(), dashboardStore: dashboard })
  app.decorate('cli', cli)
  app.decorate('chatStore', chatStore)
  app.decorate('documentStore', { documents: { get: () => null, set: vi.fn() } })
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
  const call = (method, url, body, headers = {}) => app.inject({
    method, url, headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, ...(body ? { payload: JSON.stringify(body) } : {}),
  })
  return { app, cookie, call }
}

// A general chat to ask in, then the question in it.
async function ask(opts, body, headers = {}) {
  const made = await makeApp(opts)
  const { chat } = (await made.call('POST', '/api/chats', { kind: 'general' })).json()
  const res = await made.call('POST', `/api/chats/${chat.id}/messages`, body ?? { message: 'which are remote?', filters: {}, sort: 'match' }, headers)
  return Object.assign(res, { chatId: chat.id, made })
}

describe('GET /api/chats/:id/messages', () => {
  it('returns 401 without a cookie, and 404 for a chat that is not there', async () => {
    const { app, call } = await makeApp()
    expect((await app.inject({ method: 'GET', url: '/api/chats/x/messages' })).statusCode).toBe(401)
    expect((await call('GET', '/api/chats/nope/messages')).statusCode).toBe(404)
    expect((await call('GET', '/api/chats/nope/messages')).json()).toEqual({ error: 'That chat is not there any more.' })
  })

  it('reads back what was saved in the chat, for this user only', async () => {
    const res = await ask({ cli: cliAnswering(REPLY) })
    const page = (await res.made.call('GET', `/api/chats/${res.chatId}/messages`)).json()
    expect(page).toMatchObject({ chat: { id: res.chatId, kind: 'general', title: 'which are remote?' }, dropped: false, results: [] })
    const { chatId, ...turn } = res.json()
    expect(chatId).toBe(res.chatId)
    expect(page.turns).toEqual([turn])
  })
})

describe('POST /api/chats/:id/messages', () => {
  it('answers 400 before touching the store when the message is blank, and 404 for no such chat', async () => {
    const dashboard = fakeDashboard()
    const res = await ask({ dashboard }, { message: '   ', filters: {}, sort: 'match' })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'Type a question first.' })
    expect(dashboard.getProfile).not.toHaveBeenCalled()
    expect((await res.made.call('POST', '/api/chats/nope/messages', { message: 'q' })).statusCode).toBe(404)
  })

  it('says no CLI is installed, and how to fix that, when neither is (chat honours "none", so both would do)', async () => {
    const res = await ask({})
    expect(res.statusCode).toBe(503)
    expect(res.json().kind).toBe('not_found')
    expect(res.json().error).toContain('Neither Claude Code nor Antigravity is installed')
  })

  it('assembles the context from the store, calls the CLI with no tools, and saves the turn in its chat with what it held', async () => {
    const dashboard = fakeDashboard()
    const chatStore = memoryChatStore()
    const cli = cliAnswering(REPLY)
    const res = await ask({ dashboard, chatStore, cli }, { message: 'which are remote?', filters: { levels: ['entry'] }, sort: 'match' })
    expect(res.statusCode).toBe(200)
    expect(dashboard.listPostingsForUser).toHaveBeenCalledWith('u1', expect.objectContaining({ levels: ['entry'], sort: 'match' }))
    const call = cli.run.mock.calls.at(-1)[0]
    // The chat's answer is shown as it is written, so it asks for the stream.
    expect(call.args).toEqual(CLAUDE.streamArgs(CLAUDE.promptArgs('none')))
    expect(call.timeoutMs).toBe(180000)
    expect(call.input).toContain('which are remote?')
    expect(res.json()).toMatchObject({
      question: 'which are remote?', answer: 'Two of these pay over 20 lakh and are remote.', page: 'postings',
      actions: [{ type: 'sort', value: 'newest', label: 'Sort by newest first' }], provider: 'claude',
      items: { jobs: [], documents: [] }, chatId: res.chatId,
    })
    const { chatId, ...turn } = res.json()
    expect(chatStore.chatMessages.get('u1')).toEqual({ [res.chatId]: { turns: [turn], dropped: false } })
  })

  it('never trusts a posting the request body supplies: only the store answers what is on screen', async () => {
    const cli = cliAnswering(REPLY)
    const res = await ask({ cli }, {
      message: 'what is open?', filters: {}, sort: 'match', openPostingId: 'p1',
      top: [{ id: 'fake', title: 'Invented Role', company: 'Nobody', fit: 100 }],
    })
    expect(res.statusCode).toBe(200)
    expect(cli.run.mock.calls.at(-1)[0].input).not.toContain('Invented Role')
    expect(cli.run.mock.calls.at(-1)[0].input).toContain(ROW.title)
    expect(cli.run.mock.calls.at(-1)[0].input).toContain('"chatJobs":[]')
  })

  it('answers 422 when the reply has no "reply" field to show, and drops an action the model invents', async () => {
    expect((await ask({ cli: cliAnswering(envelope('{"actions":[]}')) })).json().kind).toBe('unreadable')
    const bad = envelope(JSON.stringify({ reply: 'Sure.', actions: [{ type: 'delete-everything' }] }))
    expect((await ask({ cli: cliAnswering(bad) })).json().actions).toEqual([])
  })

  it('keeps only the refs the context carried, worded from the store, and saves them with the turn', async () => {
    const chatStore = memoryChatStore()
    const reply = envelope(JSON.stringify({ reply: 'Acme fits best.', refs: ['p1', 'invented-id', 'p1'] }))
    const res = await ask({ chatStore, cli: cliAnswering(reply) })
    expect(res.json().refs).toEqual([{ id: 'p1', title: 'Frontend Intern', company: 'Acme', fit: 55 }])
    expect(chatStore.chatMessages.get('u1')[res.chatId].turns[0].refs).toEqual(res.json().refs)
  })

  // The job's own chat is made by its first question, under the id the
  // browser had for it until then.
  it('makes a job\'s chat on its first question, and carries the job and what its actions already said', async () => {
    const open = { ...ROW, id: 'p9', title: 'Staff Engineer', descriptionText: 'Build things.', ghostSignals: [] }
    const dashboard = fakeDashboard({ open })
    dashboard.listAiResults.mockResolvedValue([{ kind: 'fake-check', postingId: 'p9', result: { verdict: 'suspicious', summary: 'No such office.' } }])
    const cli = cliAnswering(REPLY)
    const { call } = await makeApp({ dashboard, cli })
    const res = await call('POST', '/api/chats/job:p9/messages', { message: 'is it real?' })
    expect(res.statusCode).toBe(200)
    const input = cli.run.mock.calls.at(-1)[0].input
    expect(input).toContain('Staff Engineer')
    expect(input).toContain('No such office.')
    expect(input).not.toContain('"shownOnScreen":')
    expect(res.json().items).toEqual({ jobs: ['p9'], documents: [] })
    const page = (await call('GET', '/api/chats/for-job/p9')).json()
    expect(page.chat).toMatchObject({ id: res.json().chatId, kind: 'job', title: 'Staff Engineer · Acme', placeholder: false })
    expect(page.turns).toHaveLength(1)
  })

  it('streams progress and ends on exactly the body a plain caller gets', async () => {
    const plain = await ask({ cli: cliAnswering(REPLY) })
    const streamed = await ask({ cli: cliAnswering(REPLY) }, { message: 'which are remote?', filters: {}, sort: 'match' }, { accept: NDJSON_TYPE })
    expect(streamed.headers['content-type']).toMatch(/application\/x-ndjson/)
    const { events, result } = readNdjson(streamed.body)
    expect(events.map((e) => (e.event === 'start' ? 'start' : e.stage))).toEqual(['start', 'send', 'reply'])
    expect(result).toMatchObject({ answer: plain.json().answer, chatId: streamed.chatId })
  })
})
