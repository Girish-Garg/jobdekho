import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'
import { CLAUDE } from '@jobdekho/server/ai/providers.js'
import { ORIGINAL, HONEST, JD } from './fixtures/tailored-resume.js'

const config = { googleClientId: 'id', googleClientSecret: 'sec', sessionSecret: 'test-secret', baseUrl: 'http://localhost:3000' }

const POSTING = {
  id: 'p1', source: 'linkedin', title: 'Backend Engineer (Node.js)', company: 'Acme Systems', location: 'Pune',
  url: 'https://example.com/p1', descriptionText: JD, stipend: 'Rs 8 LPA',
  postedAt: '2026-09-01T00:00:00.000Z', status: null, legitimacy: 'high', ghostSignals: [],
}

function makeFakeStore({ resumeText = ORIGINAL } = {}) {
  return {
    listPostingsForUser: vi.fn().mockResolvedValue([]),
    getPosting: vi.fn(async (_userId, id) => (id === POSTING.id ? POSTING : null)),
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

// The fake CLI answers from memory. `run` is the proof of what was sent and
// under which policy; nothing here can spawn a real one.
const cliAnswering = (stdout) => ({
  locate: () => '/usr/local/bin/claude',
  run: vi.fn(async () => ({ stdout, stderr: '', code: 0 })),
  scratch: (work) => work('/scratch'),
})
const envelope = (result) => JSON.stringify({ type: 'result', result })
const reply = (resume) => envelope(JSON.stringify({
  resume, keywords: { used: ['node.js'], missing: ['kafka'] }, changes: [{ section: 'Skills', what: 'Backend first.' }],
}))

async function tailor(store, cli) {
  const app = buildApp({ config, userStore: { upsertUser: vi.fn(), getUserById: vi.fn() }, fetchProfile: vi.fn(), dashboardStore: store })
  app.decorate('cli', cli)
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
  return app.inject({ method: 'POST', url: '/api/postings/p1/ai/resume-tailor', headers: { cookie } })
}

describe('POST /api/postings/:id/ai/resume-tailor', () => {
  it('sends the resume on file with no tools, checks the rewrite and saves the checked record', async () => {
    const store = makeFakeStore()
    const cli = cliAnswering(reply(HONEST))
    const res = await tailor(store, cli)
    expect(res.statusCode).toBe(200)
    expect(store.getResumeText).toHaveBeenCalledWith('u1')
    const call = cli.run.mock.calls.at(-1)[0]
    expect(call.args).toEqual(CLAUDE.promptArgs('none'))
    expect(call.args).toEqual(expect.arrayContaining(['--tools', '']))
    expect(call.args).not.toContain('WebSearch,WebFetch')
    expect(call.timeoutMs).toBe(180000)
    expect(call.input).toContain('Priya Sharma')
    expect(call.input).toContain('Must have: Node.js')
    const [, record] = store.setAiResult.mock.calls[0]
    expect(record).toMatchObject({ kind: 'resume-tailor', postingId: 'p1', provider: 'claude' })
    expect(record.result.factCheck).toEqual({ flags: [], ok: true })
    expect(record.result.coverage).toMatchObject({ before: 9, after: 11, total: 16, gained: ['node.js', 'postgresql'] })
    expect(record.result.resume).toBe(HONEST.trim())
    expect(res.json()).toMatchObject({ kind: 'resume-tailor', createdAt: '2026-09-13T00:00:00.000Z' })
  })

  it('saves the flags when the rewrite invents, rather than refusing or hiding them', async () => {
    const store = makeFakeStore()
    const res = await tailor(store, cliAnswering(reply(HONEST.replace('Zensar Technologies', 'Tata Consultancy Services'))))
    expect(res.statusCode).toBe(200)
    const saved = res.json().result.factCheck
    expect(saved.ok).toBe(false)
    expect(saved.flags).toEqual([{
      type: 'name', value: 'Tata Consultancy Services',
      context: 'Software Developer Intern, Tata Consultancy Services, Pune (Jan 2023 to Jun 2023)',
    }])
  })

  it('answers 400 before any call when no resume is on file', async () => {
    const cli = cliAnswering(reply(HONEST))
    const res = await tailor(makeFakeStore({ resumeText: null }), cli)
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'Upload a resume first.' })
    expect(cli.run).not.toHaveBeenCalled()
  })

  it('answers 422 when the reply holds no resume', async () => {
    const store = makeFakeStore()
    const res = await tailor(store, cliAnswering(envelope('{"keywords":{}}')))
    expect(res.statusCode).toBe(422)
    expect(res.json().kind).toBe('unreadable')
    expect(store.setAiResult).not.toHaveBeenCalled()
  })
})
