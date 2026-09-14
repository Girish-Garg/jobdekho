import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'
import { CLAUDE } from '@jobdekho/server/ai/providers.js'

const config = { googleClientId: 'id', googleClientSecret: 'sec', sessionSecret: 'test-secret', baseUrl: 'http://localhost:3000' }

const POSTING = {
  id: 'p1', source: 'internshala', title: 'Frontend Intern', company: 'Acme', location: 'Pune',
  url: 'https://example.com/p1', descriptionText: 'Build the board with React.', stipend: 'Rs 20,000',
  postedAt: '2026-09-01T00:00:00.000Z', status: null, legitimacy: 'medium', ghostSignals: [],
}

function makeFakeStore({ posting = POSTING, resumeText = 'JANE DOE RESUME' } = {}) {
  return {
    listPostingsForUser: vi.fn().mockResolvedValue([]),
    getPosting: vi.fn(async (_userId, id) => (posting && id === posting.id ? posting : null)),
    setPostingStatus: vi.fn(),
    listSources: vi.fn().mockResolvedValue([]),
    getProfile: vi.fn().mockResolvedValue(null),
    getResumeText: vi.fn().mockResolvedValue(resumeText),
    upsertProfile: vi.fn(),
    deleteProfile: vi.fn(),
    getUserFilters: vi.fn().mockResolvedValue(null),
    upsertUserFilters: vi.fn(),
    getNotificationPrefs: vi.fn().mockResolvedValue(null),
    upsertNotificationPrefs: vi.fn(),
    getAiResult: vi.fn().mockResolvedValue(null),
    setAiResult: vi.fn(async (_userId, record) => ({ ...record, createdAt: '2026-09-13T00:00:00.000Z' })),
    listAiResults: vi.fn().mockResolvedValue([]),
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
const REPLY_BODY = {
  letter: 'Dear Hiring Team at Acme,\n\nI built the board with React.\n\nRegards',
  usedFromResume: ['Built the board with React'],
  notClaimed: [],
}
const REPLY = envelope(JSON.stringify(REPLY_BODY))

async function makeApp(store, cli) {
  const app = buildApp({ config, userStore: { upsertUser: vi.fn(), getUserById: vi.fn() }, fetchProfile: vi.fn(), dashboardStore: store })
  app.decorate('cli', cli)
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
  return { app, cookie }
}

async function post(store, cli) {
  const { app, cookie } = await makeApp(store, cli)
  return app.inject({ method: 'POST', url: '/api/postings/p1/ai/cover-letter', headers: { cookie } })
}

describe('POST /api/postings/:id/ai/cover-letter', () => {
  it('answers 400 and asks for a resume before touching the CLI', async () => {
    const store = makeFakeStore({ resumeText: null })
    const cli = cliAnswering(REPLY)
    const res = await post(store, cli)
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'Upload a resume first.' })
    expect(cli.run).not.toHaveBeenCalled()
  })

  it('says the CLI is not installed when it is absent', async () => {
    const res = await post(makeFakeStore(), NO_CLI)
    expect(res.statusCode).toBe(503)
    expect(res.json().kind).toBe('not_found')
  })

  it('writes the letter with no tools, saves it and returns it', async () => {
    const store = makeFakeStore()
    const cli = cliAnswering(REPLY)
    const res = await post(store, cli)
    expect(res.statusCode).toBe(200)
    const call = cli.run.mock.calls.at(-1)[0]
    expect(call.args).toEqual(CLAUDE.promptArgs('none'))
    expect(call.input).toContain('JANE DOE RESUME')
    expect(call.input).toContain('Build the board with React')
    expect(store.setAiResult).toHaveBeenCalledWith('u1', {
      kind: 'cover-letter', postingId: 'p1', provider: 'claude', result: REPLY_BODY,
    })
    expect(res.json()).toMatchObject({ kind: 'cover-letter', postingId: 'p1', createdAt: '2026-09-13T00:00:00.000Z' })
  })

  it('answers 422 when the reply holds no usable letter', async () => {
    const store = makeFakeStore()
    const res = await post(store, cliAnswering(envelope('I would rather not.')))
    expect(res.statusCode).toBe(422)
    expect(res.json().kind).toBe('unreadable')
    expect(store.setAiResult).not.toHaveBeenCalled()
  })
})
