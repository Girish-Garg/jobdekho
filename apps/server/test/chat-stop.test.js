import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'
import { readNdjson } from '@jobdekho/server/ai/events.js'

const config = { sessionSecret: 'test-secret' }

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

const delta = (text) => JSON.stringify({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text } } })

// A CLI that writes the start of an answer, then waits to be stopped, the
// way a real one is ended from spawn.js.
function writingCli() {
  let started = false
  const run = vi.fn(({ args, signal, onStdout }) => {
    if (args[0] === '--version') return Promise.resolve({ stdout: '2.1.0', stderr: '', code: 0 })
    started = true
    onStdout?.(`${delta('{"reply":"Both are')}\n`)
    return new Promise((resolve, reject) => {
      signal?.addEventListener('abort', () => reject(Object.assign(new Error('stopped'), { code: 'EABORTED' })))
    })
  })
  return { cli: { locate: () => '/usr/local/bin/claude', run, scratch: (work) => work('/scratch') }, started: () => started }
}

let users = 0
async function makeApp(cli) {
  const sub = `stop-user-${users += 1}`
  const app = buildApp({ config, dashboardStore: dashboard() })
  app.decorate('cli', cli)
  app.decorate('chatStore', chatStore())
  await app.ready()
  const headers = { cookie: `session=${app.jwt.sign({ sub, email: 'a@b.c', name: 'A', avatarUrl: null })}` }
  const call = (method, url, extra = {}) => app.inject({ method, url, headers: { ...headers, ...extra.headers }, payload: extra.payload })
  return {
    ask: (message, streamed) => call('POST', '/api/chat', { payload: { message, filters: {}, sort: 'match' }, headers: streamed ? { accept: 'application/x-ndjson' } : {} }),
    stop: async () => (await call('POST', '/api/chat/stop')).json(),
    pending: async () => (await call('GET', '/api/chat/pending')).json(),
    history: async () => (await call('GET', '/api/chat/history')).json(),
  }
}

const until = async (check) => {
  for (let i = 0; i < 100 && !(await check()); i += 1) await new Promise((resolve) => setTimeout(resolve, 10))
}

describe('stopping a question', () => {
  it('ends the CLI, saves nothing, and reports no failure', async () => {
    const { cli, started } = writingCli()
    const app = await makeApp(cli)
    const answered = app.ask('compare the top two')
    await until(async () => started())
    expect((await app.pending()).pending.text).toBe('Both are')
    expect(await app.stop()).toEqual({ stopped: true })
    const res = await answered
    expect(res.statusCode).toBe(499)
    expect(res.json()).toMatchObject({ kind: 'stopped' })
    expect(await app.pending()).toEqual({ pending: null, failed: null })
    expect((await app.history()).turns).toEqual([])
  })

  it('streams the answer as it is written, then ends the stream with the stop', async () => {
    const { cli, started } = writingCli()
    const app = await makeApp(cli)
    const answered = app.ask('compare the top two', true)
    await until(async () => started())
    await new Promise((resolve) => setTimeout(resolve, 150))
    await app.stop()
    const { events, result } = readNdjson((await answered).body)
    expect(events.filter((e) => e.event === 'text')).toEqual([{ event: 'text', add: 'Both are' }])
    expect(result).toMatchObject({ kind: 'stopped' })
  })

  it('says so when there is nothing to stop', async () => {
    const app = await makeApp(writingCli().cli)
    expect(await app.stop()).toEqual({ stopped: false })
  })
})
