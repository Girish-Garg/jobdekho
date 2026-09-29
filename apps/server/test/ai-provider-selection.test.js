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
