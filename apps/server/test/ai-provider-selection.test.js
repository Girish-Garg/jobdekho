import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'
import { agyRan, agyReply } from './fixtures/agy-stream.js'

// End-to-end proof that a saved preference (packages/store/src/ai-provider-pref.js)
// actually reaches select.js through the app, not just pickProvider in isolation.
const config = { sessionSecret: 'test-secret', devUserId: 'local' }

const POSTING = {
  id: 'p1', source: 'internshala', title: 'Frontend Intern', company: 'Acme', location: 'Pune',
  url: 'https://example.com/p1', descriptionText: 'Build the board with React.', stipend: 'Rs 20,000',
  postedAt: '2026-09-01T00:00:00.000Z', status: null, legitimacy: 'medium', ghostSignals: [],
}

const LETTER = { letter: 'Dear Hiring Team,\n\nI built the board.\n\nRegards', usedFromResume: [], notClaimed: [] }
const CLAUDE_REPLY = JSON.stringify({ type: 'result', result: JSON.stringify(LETTER) })
const AGY_REPLY = agyReply(JSON.stringify(LETTER))

function makeFakeStore(providerPref) {
  return {
    getPosting: vi.fn(async (_userId, id) => (id === POSTING.id ? POSTING : null)),
    getResumeText: vi.fn().mockResolvedValue('JANE DOE RESUME'),
    setAiResult: vi.fn(async (_userId, record) => record),
    getProviderPref: vi.fn().mockResolvedValue(providerPref),
  }
}

// Both CLIs installed and answering; which one actually runs is the thing
// under test, not the reply itself.
function bothInstalled() {
  return {
    locate: (name) => `/usr/local/bin/${name}`,
    run: vi.fn(async ({ file, args }) => {
      if (args[0] !== '--version') {
        return file.endsWith('claude') ? { stdout: CLAUDE_REPLY, stderr: '', code: 0 } : { stdout: AGY_REPLY, stderr: '', code: 0, collected: agyRan() }
      }
      return { stdout: '1.0.0\n', stderr: '', code: 0 }
    }),
    scratch: (work) => work('/scratch'),
    home: '/no/such/home',
  }
}

async function writeCoverLetter(providerPref) {
  const app = buildApp({ config, dashboardStore: makeFakeStore(providerPref) })
  app.decorate('cli', bothInstalled())
  await app.ready()
  return app.inject({ method: 'POST', url: '/api/postings/p1/ai/cover-letter' })
}

describe('a saved provider preference reaching an actual AI call', () => {
  it('still picks Claude Code by default, preference untouched', async () => {
    const res = await writeCoverLetter(null)
    expect(res.statusCode).toBe(200)
    expect(res.json().provider).toBe('claude')
  })

  it('routes to the preferred CLI instead of the default order', async () => {
    const res = await writeCoverLetter({ provider: 'agy' })
    expect(res.statusCode).toBe(200)
    expect(res.json().provider).toBe('agy')
  })

  it('ignores an auto preference, same as no preference at all', async () => {
    const res = await writeCoverLetter({ provider: 'auto' })
    expect(res.statusCode).toBe(200)
    expect(res.json().provider).toBe('claude')
  })
})

// Ollama beside both CLIs, its server answering with two models. The model
// server is a fake: it records what it was asked and answers the letter.
function withOllama() {
  const cli = bothInstalled()
  const tags = { models: ['llama3.2:3b', 'qwen3:8b'].map((name) => ({ name, size: 2e9, details: { context_length: 131072 }, capabilities: ['completion'] })) }
  cli.http = vi.fn(async ({ url }) => {
    if (url.endsWith('/api/tags')) return { status: 200, body: tags }
    if (url.endsWith('/api/version')) return { status: 200, body: { version: '0.32.12' } }
    return { status: 200, body: { response: JSON.stringify(LETTER), done: true, done_reason: 'stop' } }
  })
  return cli
}

async function runAs(kind, providerPref, cli) {
  const store = makeFakeStore(providerPref)
  const app = buildApp({ config, dashboardStore: store })
  app.decorate('cli', cli)
  await app.ready()
  return app.inject({ method: 'POST', url: `/api/postings/p1/ai/${kind}` })
}

const generations = (cli) => cli.http.mock.calls.map(([req]) => req).filter((req) => req.url.endsWith('/api/generate'))

describe('a saved preference for Ollama', () => {
  it('writes the cover letter on this computer with the saved model', async () => {
    const cli = withOllama()
    const res = await runAs('cover-letter', { provider: 'ollama', ollamaModel: 'qwen3:8b' }, cli)
    expect(res.statusCode).toBe(200)
    expect(res.json().provider).toBe('ollama')
    expect(res.json().result.letter).toBe(LETTER.letter)
    const [generate] = generations(cli)
    expect(generate.url).toBe('http://127.0.0.1:11434/api/generate')
    expect(generate.body).toMatchObject({ model: 'qwen3:8b', format: 'json', stream: false })
    expect(generate.body.prompt).toContain('JANE DOE RESUME')
    expect(cli.run.mock.calls.filter(([c]) => c.args[0] !== '--version')).toHaveLength(0)
  })

  it('uses the first installed model when none is saved', async () => {
    const cli = withOllama()
    await runAs('cover-letter', { provider: 'ollama' }, cli)
    expect(generations(cli)[0].body.model).toBe('llama3.2:3b')
  })

  // It cannot search, so the one web action goes to a CLI that can.
  it('never hands it "Is this job real?", even preferred', async () => {
    const cli = withOllama()
    const res = await runAs('fake-check', { provider: 'ollama', ollamaModel: 'qwen3:8b' }, cli)
    expect(res.json().provider).toBe('claude')
    expect(generations(cli)).toHaveLength(0)
  })

  it('leaves the default order alone: Claude Code still answers when nothing is picked', async () => {
    const cli = withOllama()
    const res = await runAs('cover-letter', null, cli)
    expect(res.json().provider).toBe('claude')
    expect(generations(cli)).toHaveLength(0)
  })
})
