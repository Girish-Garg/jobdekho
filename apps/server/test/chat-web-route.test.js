import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'
import { readNdjson, NDJSON_TYPE } from '@jobdekho/server/ai/events.js'
import { memoryChatStore } from './fixtures/chat-store.js'

const config = { googleClientId: 'id', googleClientSecret: 'sec', sessionSecret: 'test-secret', baseUrl: 'http://localhost:3000' }

const ROW = { id: 'p1', title: 'Frontend Intern', company: 'Acme', location: 'Pune', level: 'entry', fit: 55, grade: 'B' }
const OPEN = { ...ROW, url: 'https://acme.example/jobs/1', status: 'saved', descriptionText: 'Build the board.' }
// A career record whose every value would be a leak if it reached the web.
const PROFILE = {
  basics: { name: 'Jane Doe', email: 'jane@example.com', phone: '+91 90000 00000', location: 'Pune' },
  skills: ['react', 'node'], titles: ['frontend developer'], years: 2, resumeText: 'JANE DOE RESUME',
}

function fakeDashboard() {
  const none = vi.fn().mockResolvedValue(null)
  return {
    listPostingsForUser: vi.fn().mockResolvedValue([ROW]), getPosting: vi.fn().mockResolvedValue(OPEN),
    getProfile: vi.fn().mockResolvedValue(PROFILE), listAiResults: vi.fn().mockResolvedValue([]),
    setPostingStatus: vi.fn(), listSources: vi.fn().mockResolvedValue([]), listCompanies: vi.fn().mockResolvedValue(['Acme']), getResumeText: none, upsertProfile: vi.fn(),
    deleteProfile: vi.fn(), getUserFilters: none, upsertUserFilters: vi.fn(), getAiResult: none, setAiResult: vi.fn(),
    getProviderPref: none, upsertProviderPref: vi.fn(),
  }
}

// Acme's own chat, 'job', with `turns` asked in it before, and a general
// chat, 'general', with none. Memory is empty here.
const AT = '2026-09-30T00:00:00.000Z'
const chat = (id, kind, jobs) => ({ id, kind, jobs, documents: [], title: id, createdAt: AT, updatedAt: AT, seenAt: null })
function fakeChatStore(turns = []) {
  return memoryChatStore({
    chats: { u1: { chats: [chat('job', 'job', ['p1']), chat('general', 'general', [])] } },
    chatMessages: { u1: { job: { turns, dropped: false } } },
  })
}

const envelope = (obj) => JSON.stringify({ type: 'result', result: typeof obj === 'string' ? obj : JSON.stringify(obj) })
const FIRST = envelope({ reply: 'You fit Acme at 55%, Jane.', refs: ['p1'], actions: [{ type: 'sort', value: 'newest' }], web: true })
const FOUND = envelope({ reply: 'Acme raised a Series B in 2026.', sources: ['https://news.example/acme', 'javascript:alert(1)'] })

// Claude Code on PATH; the record-reading call and the search told apart by
// the tools each was given.
function cli({ first = FIRST, found = FOUND } = {}) {
  return {
    locate: () => '/usr/local/bin/claude',
    run: vi.fn(async ({ args }) => {
      if (args[0] === '--version') return { stdout: '2.1.0\n', stderr: '', code: 0 }
      return { stdout: args.includes('WebSearch,WebFetch') ? found : first, stderr: '', code: 0 }
    }),
    scratch: (work) => work('/scratch'),
  }
}
const prompts = (fake) => fake.run.mock.calls.map((c) => c[0]).filter((c) => c.args[0] !== '--version')

async function ask({ fake = cli(), store = fakeChatStore(), headers = {}, chatId = 'job' } = {}) {
  const app = buildApp({ config, userStore: { upsertUser: vi.fn(), getUserById: vi.fn() }, fetchProfile: vi.fn(), dashboardStore: fakeDashboard() })
  app.decorate('cli', fake)
  app.decorate('chatStore', store)
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
  const payload = JSON.stringify({ message: 'Is Acme doing well as a company?', filters: {}, sort: 'match' })
  return app.inject({ method: 'POST', url: `/api/chats/${chatId}/messages`, payload, headers: { cookie, 'content-type': 'application/json', ...headers } })
}

describe('a chat question that needs the web', () => {
  // A job's own chat hands the search that job's public fields, and nothing
  // else of what the first call read.
  it('reads the record with no tools, then searches with the question and the public job alone', async () => {
    const fake = cli()
    const store = fakeChatStore([{ question: 'what fits me?', answer: 'Acme, at 55%, given your React.' }])
    const res = await ask({ fake, store })
    expect(res.statusCode).toBe(200)
    const [first, search] = prompts(fake)
    expect(first.args.slice(first.args.indexOf('--tools'), first.args.indexOf('--tools') + 2)).toEqual(['--tools', ''])
    expect(first.input).toContain('skills react, node; target titles frontend developer')
    expect(search.args).toContain('WebSearch,WebFetch')
    expect(search.input).toContain('Question: Is Acme doing well as a company?')
    expect(search.input).toContain('- what fits me?')
    expect(search.input).toContain('url: https://acme.example/jobs/1')
    expect(search.input).not.toMatch(/Jane|jane@|90000|JANE DOE|react|frontend developer|55%|saved|Build the board/i)
  })

// What JobDekho holds comes first; the web is added after it, never in its
  // place (answered only from the web, "is Razorpay hiring?" hid the ten
  // Razorpay openings JobDekho had).
  it('keeps the answer from JobDekho\'s own data and adds what the search found after it', async () => {
    const store = fakeChatStore()
    const res = await ask({ store })
    expect(res.json()).toMatchObject({
      question: 'Is Acme doing well as a company?', answer: 'You fit Acme at 55%, Jane.',
      // The chat's own job, which no feed row scored here.
      refs: [{ id: 'p1', title: 'Frontend Intern', company: 'Acme', fit: null }], actions: [{ type: 'sort', value: 'newest' }],
      provider: 'claude',
      web: { answer: 'Acme raised a Series B in 2026.', sources: ['https://news.example/acme'], provider: 'claude' },
    })
    const { chatId, ...turn } = res.json()
    expect(chatId).toBe('job')
    expect(store.chatMessages.get('u1').job.turns[0]).toEqual(turn)
  })

  // A general chat's: the jobs a question names come from the feed's corpus.
  it('puts every opening of a company the question names in front of the first call', async () => {
    const fake = cli()
    await ask({ fake, chatId: 'general' })
    const [first] = prompts(fake)
    expect(first.input).toContain('"companiesTheQuestionNames":[{"company":"Acme","openCount":1,"notSeenRecently":0,"postings":[{"id":"p1"')
  })

  it('keeps the first answer, and says why, when the search cannot be read', async () => {
    const res = await ask({ fake: cli({ found: envelope({ answer: 'the wrong key' }) }) })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ answer: 'You fit Acme at 55%, Jane.', actions: [{ type: 'sort', value: 'newest' }] })
    expect(res.json().webError).toMatch(/Claude Code answered, but the reply was not in the shape JobDekho expected/)
    expect(res.json().web).toBeUndefined()
  })

  it('makes one call when the first answer does not ask for the web', async () => {
    const fake = cli({ first: envelope({ reply: 'Acme is the top match.', web: 'yes' }) })
    const res = await ask({ fake })
    expect(prompts(fake)).toHaveLength(1)
    expect(res.json().answer).toBe('Acme is the top match.')
    expect(res.json().sources).toBeUndefined()
  })

  it('streams a web stage between the two calls', async () => {
    const res = await ask({ headers: { accept: NDJSON_TYPE } })
    const { events } = readNdjson(res.body)
    expect(events.map((e) => (e.event === 'start' ? 'start' : e.stage))).toEqual(['start', 'send', 'reply', 'web', 'start', 'send', 'reply'])
  })
})
