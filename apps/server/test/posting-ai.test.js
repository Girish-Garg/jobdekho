import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'
import { readNdjson, NDJSON_TYPE } from '@jobdekho/server/ai/events.js'
import { CLAUDE } from '@jobdekho/server/ai/providers.js'

const config = { googleClientId: 'id', googleClientSecret: 'sec', sessionSecret: 'test-secret', baseUrl: 'http://localhost:3000' }

const POSTING = {
  id: 'p1', source: 'internshala', title: 'Frontend Intern', company: 'Acme', location: 'Pune',
  url: 'https://example.com/p1', descriptionText: 'Build the board with React.', stipend: 'Rs 20,000',
  postedAt: '2026-09-01T00:00:00.000Z', status: null, legitimacy: 'medium', ghostSignals: ['no pay stated'],
}
const SAVED = { kind: 'fake-check', postingId: 'p1', provider: 'claude', createdAt: '2026-09-13T00:00:00.000Z', result: { verdict: 'genuine' } }

function makeFakeStore({ posting = POSTING, results = [] } = {}) {
  return {
    listPostingsForUser: vi.fn().mockResolvedValue([]),
    getPosting: vi.fn(async (_userId, id) => (posting && id === posting.id ? posting : null)),
    setPostingStatus: vi.fn(),
    listSources: vi.fn().mockResolvedValue([]),
    getProfile: vi.fn().mockResolvedValue(null),
    getResumeText: vi.fn().mockResolvedValue('JANE DOE RESUME'),
    upsertProfile: vi.fn(),
    deleteProfile: vi.fn(),
    getUserFilters: vi.fn().mockResolvedValue(null),
    upsertUserFilters: vi.fn(),
    getNotificationPrefs: vi.fn().mockResolvedValue(null),
    upsertNotificationPrefs: vi.fn(),
    getAiResult: vi.fn().mockResolvedValue(null),
    setAiResult: vi.fn(async (_userId, record) => ({ ...record, createdAt: '2026-09-13T00:00:00.000Z' })),
    listAiResults: vi.fn().mockResolvedValue(results),
  }
}

// A machine with no AI CLI at all. `run` throwing is the proof that nothing
// tried to spawn one anyway.
const NO_CLI = { locate: () => null, run: vi.fn(async () => { throw new Error('a test spawned a CLI') }) }

const cliAnswering = (stdout) => ({
  locate: () => '/usr/local/bin/claude',
  run: vi.fn(async () => ({ stdout, stderr: '', code: 0 })),
  scratch: (work) => work('/scratch'),
})
const envelope = (result, extra = {}) => JSON.stringify({ type: 'result', result, ...extra })
const REPLY = envelope(JSON.stringify({ verdict: 'genuine', stillOpen: true, summary: 'Acme is real.', checks: [], redFlags: [] }))

async function makeApp(store, cli = NO_CLI) {
  const app = buildApp({ config, userStore: { upsertUser: vi.fn(), getUserById: vi.fn() }, fetchProfile: vi.fn(), dashboardStore: store })
  app.decorate('cli', cli)
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
  return { app, cookie }
}

async function check(store, cli, headers = {}, url = '/api/postings/p1/ai/fake-check', body) {
  const { app, cookie } = await makeApp(store, cli)
  const payload = body ? JSON.stringify(body) : undefined
  const extra = body ? { 'content-type': 'application/json' } : {}
  return app.inject({ method: 'POST', url, payload, headers: { cookie, ...extra, ...headers } })
}

describe('GET /api/postings/:id/ai', () => {
  it('returns 401 without a cookie', async () => {
    const { app } = await makeApp(makeFakeStore())
    expect((await app.inject({ method: 'GET', url: '/api/postings/p1/ai' })).statusCode).toBe(401)
  })

  it('lists what has been saved for the posting, for this user', async () => {
    const store = makeFakeStore({ results: [SAVED] })
    const { app, cookie } = await makeApp(store)
    const res = await app.inject({ method: 'GET', url: '/api/postings/p1/ai', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ results: [SAVED] })
    expect(store.listAiResults).toHaveBeenCalledWith('u1', 'p1')
  })
})

describe('POST /api/postings/:id/ai/:kind', () => {
  it('answers 404 for an action that does not exist, before touching the store', async () => {
    const store = makeFakeStore()
    const res = await check(store, NO_CLI, {}, '/api/postings/p1/ai/write-my-thesis')
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'no such action' })
    expect(store.getPosting).not.toHaveBeenCalled()
  })

  it('answers 404 for a name every object inherits, rather than a 500', async () => {
    for (const kind of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      const res = await check(makeFakeStore(), NO_CLI, {}, `/api/postings/p1/ai/${kind}`)
      expect(res.statusCode, kind).toBe(404)
    }
  })

  it('answers 404 for a posting the corpus does not have', async () => {
    const res = await check(makeFakeStore(), NO_CLI, {}, '/api/postings/nope/ai/fake-check')
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'no such posting' })
  })

  it('says the CLI is not installed, and how to fix that, when it is absent', async () => {
    const res = await check(makeFakeStore(), NO_CLI)
    expect(res.statusCode).toBe(503)
    expect(res.json().kind).toBe('not_found')
    expect(res.json().error).toMatch(/Claude Code is not installed.*claude\.ai\/code/)
  })

  it('runs the check with only web tools, saves the record and returns it', async () => {
    const store = makeFakeStore()
    const cli = cliAnswering(REPLY)
    const res = await check(store, cli)
    expect(res.statusCode).toBe(200)
    const call = cli.run.mock.calls.at(-1)[0]
    expect(call.args).toEqual(CLAUDE.promptArgs('web'))
    expect(call.args).toEqual(expect.arrayContaining(['--tools', 'WebSearch,WebFetch']))
    expect(call.timeoutMs).toBe(300000)
    expect(call.input).toContain('Build the board with React.')
    expect(store.setAiResult).toHaveBeenCalledWith('u1', {
      kind: 'fake-check', postingId: 'p1', provider: 'claude', instruction: '',
      result: { verdict: 'genuine', stillOpen: true, summary: 'Acme is real.', checks: [], redFlags: [] },
    })
    expect(res.json()).toMatchObject({ kind: 'fake-check', postingId: 'p1', createdAt: '2026-09-13T00:00:00.000Z' })
  })

  // The one call with a browser must never have the resume in the room.
  it('never loads the resume or profile for the fake check, let alone sends them', async () => {
    const store = makeFakeStore()
    const cli = cliAnswering(REPLY)
    await check(store, cli)
    expect(store.getResumeText).not.toHaveBeenCalled()
    expect(store.getProfile).not.toHaveBeenCalled()
    expect(cli.run.mock.calls.at(-1)[0].input).not.toContain('JANE DOE')
  })

  it('answers 422 when the reply holds no verdict', async () => {
    const store = makeFakeStore()
    const res = await check(store, cliAnswering(envelope('I would rather not.')))
    expect(res.statusCode).toBe(422)
    expect(res.json().kind).toBe('unreadable')
    expect(store.setAiResult).not.toHaveBeenCalled()
  })

  it('reports an expired login even though the CLI exited 0', async () => {
    const res = await check(makeFakeStore(), cliAnswering(envelope('Failed to authenticate: OAuth session expired', { is_error: true })))
    expect(res.statusCode).toBe(503)
    expect(res.json().kind).toBe('login')
  })
})

describe('POST /api/postings/:id/ai/:kind with an instruction', () => {
  const PREVIOUS = {
    kind: 'fake-check', postingId: 'p1', provider: 'claude', createdAt: '2026-09-12T00:00:00.000Z',
    result: { verdict: 'unclear', stillOpen: null, summary: 'Too little to go on.', checks: [], redFlags: [] },
  }

  it('loads the saved answer and refines from it, into the prompt and the saved record', async () => {
    const store = makeFakeStore()
    store.getAiResult.mockResolvedValue(PREVIOUS)
    const cli = cliAnswering(REPLY)
    const res = await check(store, cli, {}, '/api/postings/p1/ai/fake-check', { instruction: 'check the recruiter email' })
    expect(res.statusCode).toBe(200)
    expect(store.getAiResult).toHaveBeenCalledWith('u1', 'p1', 'fake-check')
    const call = cli.run.mock.calls.at(-1)[0]
    expect(call.input).toContain('Too little to go on.')
    expect(call.input).toContain('check the recruiter email')
    expect(store.setAiResult).toHaveBeenCalledWith('u1', expect.objectContaining({ instruction: 'check the recruiter email' }))
  })

  it('does not look for a saved answer when there is no instruction', async () => {
    const store = makeFakeStore()
    await check(store, cliAnswering(REPLY))
    expect(store.getAiResult).not.toHaveBeenCalled()
  })

  it('runs fresh, with an empty instruction on the saved record, when there is nothing yet to refine', async () => {
    const store = makeFakeStore()
    const cli = cliAnswering(REPLY)
    const res = await check(store, cli, {}, '/api/postings/p1/ai/fake-check', { instruction: 'shorter' })
    expect(res.statusCode).toBe(200)
    expect(cli.run.mock.calls.at(-1)[0].input).not.toContain('<<<PREVIOUS')
    expect(store.setAiResult).toHaveBeenCalledWith('u1', expect.objectContaining({ instruction: '' }))
  })

  it('treats a blank instruction as no instruction at all', async () => {
    const store = makeFakeStore()
    await check(store, cliAnswering(REPLY), {}, '/api/postings/p1/ai/fake-check', { instruction: '   ' })
    expect(store.getAiResult).not.toHaveBeenCalled()
  })
})

describe('POST /api/postings/:id/ai/:kind as NDJSON', () => {
  const accept = { accept: NDJSON_TYPE }

  it('streams progress lines and ends on exactly the body a plain caller gets', async () => {
    const plain = await check(makeFakeStore(), cliAnswering(REPLY))
    const streamed = await check(makeFakeStore(), cliAnswering(REPLY), accept)
    expect(streamed.statusCode).toBe(200)
    expect(streamed.headers['content-type']).toMatch(/application\/x-ndjson/)
    const { events, result } = readNdjson(streamed.body)
    expect(events.map((e) => e.event === 'start' ? 'start' : e.stage)).toEqual(['start', 'send', 'reply'])
    expect(result).toEqual(plain.json())
  })

  it('reports a failure as a last line with error and kind, under a 200', async () => {
    const res = await check(makeFakeStore(), NO_CLI, accept)
    expect(res.statusCode).toBe(200)
    expect(readNdjson(res.body).result).toMatchObject({ kind: 'not_found' })
  })

  it('answers the unknown-posting case as plain JSON, not a stream', async () => {
    const res = await check(makeFakeStore(), NO_CLI, accept, '/api/postings/nope/ai/fake-check')
    expect(res.statusCode).toBe(404)
    expect(res.headers['content-type']).toMatch(/application\/json/)
  })
})
