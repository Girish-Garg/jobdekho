import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'
import { CLAUDE } from '@jobdekho/server/ai/providers.js'
import { PROFILE, PLAN, JD } from './fixtures/tailored-resume.js'

const config = { googleClientId: 'id', googleClientSecret: 'sec', sessionSecret: 'test-secret', baseUrl: 'http://localhost:3000' }

const POSTING = {
  id: 'p1', source: 'linkedin', title: 'Backend Engineer (Node.js)', company: 'Acme Systems', location: 'Pune',
  url: 'https://example.com/p1', descriptionText: JD, stipend: 'Rs 8 LPA',
  postedAt: '2026-09-01T00:00:00.000Z', status: null, legitimacy: 'high', ghostSignals: [],
}

const EMPTY_PROFILE = {
  basics: { name: '', headline: '', email: '', phone: '', location: '', links: {} },
  experience: [], projects: [], education: [], certifications: [], achievements: [], skillGroups: [],
}

function makeFakeStore({ profile = PROFILE } = {}) {
  return {
    listPostingsForUser: vi.fn().mockResolvedValue([]),
    getPosting: vi.fn(async (_userId, id) => (id === POSTING.id ? POSTING : null)),
    setPostingStatus: vi.fn(),
    listSources: vi.fn().mockResolvedValue([]),
    getProfile: vi.fn().mockResolvedValue(profile),
    getResumeText: vi.fn().mockResolvedValue(null),
    upsertProfile: vi.fn(),
    deleteProfile: vi.fn(),
    getUserFilters: vi.fn().mockResolvedValue(null),
    upsertUserFilters: vi.fn(),
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
const reply = (plan) => envelope(JSON.stringify(plan))

async function tailor(store, cli, body) {
  const app = buildApp({ config, userStore: { upsertUser: vi.fn(), getUserById: vi.fn() }, fetchProfile: vi.fn(), dashboardStore: store })
  app.decorate('cli', cli)
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
  const payload = body ? JSON.stringify(body) : undefined
  const headers = body ? { cookie, 'content-type': 'application/json' } : { cookie }
  return app.inject({ method: 'POST', url: '/api/postings/p1/ai/resume-tailor', payload, headers })
}

describe('POST /api/postings/:id/ai/resume-tailor', () => {
  it('sends the career record with no tools, checks the plan and saves the checked record', async () => {
    const store = makeFakeStore()
    const cli = cliAnswering(reply(PLAN))
    const res = await tailor(store, cli)
    expect(res.statusCode).toBe(200)
    expect(store.getProfile).toHaveBeenCalledWith('u1')
    const call = cli.run.mock.calls.at(-1)[0]
    expect(call.args).toEqual(CLAUDE.promptArgs('none'))
    expect(call.args).toEqual(expect.arrayContaining(['--tools', '']))
    expect(call.args).not.toContain('WebSearch,WebFetch')
    expect(call.timeoutMs).toBe(180000)
    expect(call.input).toContain('Infobeans Technologies')
    expect(call.input).toContain('Must have: Node.js')
    const [, record] = store.setAiResult.mock.calls[0]
    expect(record).toMatchObject({ kind: 'resume-tailor', postingId: 'p1', provider: 'claude' })
    expect(record.result.factCheck).toEqual({ flags: [], ok: true })
    // 9, not 8: the record lists skills no bullet says out loud (its Tools
    // group), and coverage counts what the record shows, not only its prose.
    expect(record.result.coverage).toMatchObject({ before: 9, after: 10, total: 16, gained: ['node.js', 'postgresql'] })
    expect(record.result.sections.experience.map((e) => e.id)).toEqual(['exp-infobeans', 'exp-zensar'])
    expect(res.json()).toMatchObject({ kind: 'resume-tailor', createdAt: '2026-09-13T00:00:00.000Z' })
  })

  it('saves the flags when a kept bullet invents, rather than refusing or hiding them', async () => {
    const store = makeFakeStore()
    const lying = JSON.parse(JSON.stringify(PLAN))
    lying.sections.experience[0].bullets[0] = lying.sections.experience[0].bullets[0].replace('35 %', '45%')
    const res = await tailor(store, cliAnswering(reply(lying)))
    expect(res.statusCode).toBe(200)
    const saved = res.json().result.factCheck
    expect(saved.ok).toBe(false)
    expect(saved.flags).toEqual([{ type: 'number', value: '45%', context: expect.stringContaining('45%') }])
  })

  it('drops an entry id the profile does not have, rather than trusting the model\'s claim', async () => {
    const store = makeFakeStore()
    const invented = JSON.parse(JSON.stringify(PLAN))
    invented.sections.experience.push({ id: 'exp-does-not-exist', bullets: ['Led a team that never existed.'], dropped: [] })
    const res = await tailor(store, cliAnswering(reply(invented)))
    expect(res.statusCode).toBe(200)
    expect(res.json().result.sections.experience.map((e) => e.id)).toEqual(['exp-infobeans', 'exp-zensar'])
  })

  it('answers 400 before any call when the career record has no entries yet', async () => {
    const cli = cliAnswering(reply(PLAN))
    const res = await tailor(makeFakeStore({ profile: EMPTY_PROFILE }), cli)
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'Add at least one entry to your career record first.' })
    expect(cli.run).not.toHaveBeenCalled()
  })

  it('answers 422 when nothing in the reply survives validation', async () => {
    const store = makeFakeStore()
    const res = await tailor(store, cliAnswering(envelope('{"keywords":{}}')))
    expect(res.statusCode).toBe(422)
    expect(res.json().kind).toBe('unreadable')
    expect(store.setAiResult).not.toHaveBeenCalled()
  })

  it('refines from the saved plan when the body carries an instruction', async () => {
    const store = makeFakeStore()
    const saved = { kind: 'resume-tailor', postingId: 'p1', provider: 'claude', createdAt: '2026-09-12T00:00:00.000Z', result: PLAN }
    store.getAiResult.mockResolvedValue(saved)
    const cli = cliAnswering(reply(PLAN))
    const res = await tailor(store, cli, { instruction: 'lead with the Bosch project' })
    expect(res.statusCode).toBe(200)
    expect(store.getAiResult).toHaveBeenCalledWith('u1', 'p1', 'resume-tailor')
    const call = cli.run.mock.calls.at(-1)[0]
    expect(call.input).toContain('<<<PREVIOUS')
    expect(call.input).toContain('lead with the Bosch project')
    const [, record] = store.setAiResult.mock.calls[0]
    expect(record.instruction).toBe('lead with the Bosch project')
    expect(record.result.factCheck).toEqual({ flags: [], ok: true })
  })
})
