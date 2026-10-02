import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'
import { beginQuestion, noteEvent, endQuestion, questionState, answeringIn } from '@jobdekho/server/chat/in-flight.js'

const config = { sessionSecret: 'test-secret' }
const REPLY = JSON.stringify({ type: 'result', result: JSON.stringify({ reply: 'Two are remote.' }) })

const dashboard = () => ({
  listPostingsForUser: vi.fn().mockResolvedValue([]), getPosting: vi.fn().mockResolvedValue(null), setPostingStatus: vi.fn(),
  listSources: vi.fn().mockResolvedValue([]), listCompanies: vi.fn().mockResolvedValue([]), getProfile: vi.fn().mockResolvedValue(null),
  getResumeText: vi.fn().mockResolvedValue(null), upsertProfile: vi.fn(), deleteProfile: vi.fn(),
  getUserFilters: vi.fn().mockResolvedValue(null), upsertUserFilters: vi.fn(), getAiResult: vi.fn().mockResolvedValue(null),
  setAiResult: vi.fn(), listAiResults: vi.fn().mockResolvedValue([]), getProviderPref: vi.fn().mockResolvedValue(null), upsertProviderPref: vi.fn(),
})

// The chat route also reads the person's memory, empty here.
const chatStore = () => {
  const data = {}
  const memory = {}
  return {
    chatHistory: { get: (id) => data[id] ?? null, set: (id, record) => { data[id] = record } },
    memory: { get: (id) => memory[id] ?? null, set: (id, record) => { memory[id] = record } },
  }
}

// A CLI that answers only when the test lets it, so the question can be
// looked at while it is still in flight.
function heldCli(stdout = REPLY, code = 0) {
  let release
  const gate = new Promise((resolve) => { release = resolve })
  const run = vi.fn(async ({ args }) => {
    if (args[0] === '--version') return { stdout: '2.1.0', stderr: '', code: 0 }
    await gate
    return { stdout, stderr: code ? 'boom' : '', code }
  })
  const asked = () => run.mock.calls.some(([call]) => call.args[0] !== '--version')
  return { cli: { locate: () => '/usr/local/bin/claude', run, scratch: (work) => work('/scratch') }, release, asked }
}

let users = 0
async function makeApp(cli) {
  const sub = `pending-user-${users += 1}`
  const app = buildApp({ config, dashboardStore: dashboard() })
  app.decorate('cli', cli)
  app.decorate('chatStore', chatStore())
  await app.ready()
  const headers = { cookie: `session=${app.jwt.sign({ sub, email: 'a@b.c', name: 'A', avatarUrl: null })}` }
  const ask = (message) => app.inject({ method: 'POST', url: '/api/chat', payload: { message, filters: {}, sort: 'match' }, headers })
  const pending = async () => (await app.inject({ method: 'GET', url: '/api/chat/pending', headers })).json()
  const history = async () => (await app.inject({ method: 'GET', url: '/api/chat/history', headers })).json()
  return { ask, pending, history }
}

const until = async (check) => {
  for (let i = 0; i < 50 && !(await check()); i += 1) await new Promise((resolve) => setTimeout(resolve, 10))
}

describe('the question in flight', () => {
  it('is readable while it is answered, with the CLI answering it, and gone once saved', async () => {
    const { cli, release, asked } = heldCli()
    const { ask, pending, history } = await makeApp(cli)
    const answered = ask('which are remote?')
    await until(async () => asked())
    const during = await pending()
    expect(during.pending).toMatchObject({ question: 'which are remote?', provider: 'claude', web: false })
    expect(Date.parse(during.pending.startedAt)).not.toBeNaN()
    release()
    expect((await answered).statusCode).toBe(200)
    expect(await pending()).toEqual({ pending: null, failed: null })
    expect((await history()).turns.map((t) => t.question)).toEqual(['which are remote?'])
  })

  it('refuses a second question until the first is answered', async () => {
    const { cli, release, asked } = heldCli()
    const { ask } = await makeApp(cli)
    const first = ask('one')
    await until(async () => asked())
    const second = await ask('two')
    expect(second.statusCode).toBe(409)
    expect(second.json().error).toMatch(/Still answering/)
    release()
    await first
    expect((await ask('three')).statusCode).not.toBe(409)
  })

  // A page reloaded mid-answer has no stream to hear the failure on.
  it('keeps a failure for the next reader, once', async () => {
    const { cli, release, asked } = heldCli('', 1)
    const { ask, pending } = await makeApp(cli)
    const failing = ask('will fail')
    await until(async () => asked())
    release()
    expect((await failing).statusCode).toBeGreaterThanOrEqual(400)
    const after = await pending()
    expect(after.pending).toBeNull()
    expect(after.failed).toMatchObject({ question: 'will fail' })
    expect(after.failed.error).toBeTruthy()
    expect((await pending()).failed).toBeNull()
  })
})

describe('in-flight.js', () => {
  it('follows the stream: the CLI, the stage, and a turn to the web', () => {
    expect(beginQuestion('unit-a', 'q', 0)).toBe(true)
    expect(beginQuestion('unit-a', 'again', 0)).toBe(false)
    noteEvent('unit-a', { event: 'start', provider: 'agy' })
    noteEvent('unit-a', { event: 'progress', stage: 'web' })
    expect(questionState('unit-a').pending).toEqual({ question: 'q', startedAt: new Date(0).toISOString(), provider: 'agy', stage: 'web', web: true, text: '' })
    endQuestion('unit-a')
    expect(questionState('unit-a')).toEqual({ pending: null, failed: null })
  })

  it('names the conversation the question was asked in, while it is answered', () => {
    beginQuestion('unit-c', 'q', 0, 'conv-1')
    expect(questionState('unit-c').pending.conversationId).toBe('conv-1')
    expect(answeringIn('unit-c')).toBe('conv-1')
    endQuestion('unit-c')
    expect(answeringIn('unit-c')).toBeNull()
  })

  it('forgets an old failure when a new question starts', () => {
    beginQuestion('unit-b', 'first', 0)
    endQuestion('unit-b', 'It broke.', 1000)
    beginQuestion('unit-b', 'second', 2000)
    expect(questionState('unit-b').failed).toBeNull()
    endQuestion('unit-b')
  })
})
