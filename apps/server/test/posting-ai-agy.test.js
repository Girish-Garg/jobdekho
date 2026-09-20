import { describe, it, expect, vi } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from '@jobdekho/server/app.js'
import { CLAUDE, AGY } from '@jobdekho/server/ai/providers.js'
import { encodeAgyInput } from '@jobdekho/server/ai/agy.js'
import { agyReply } from './fixtures/agy-stream.js'

const config = { googleClientId: 'id', googleClientSecret: 'sec', sessionSecret: 'test-secret', baseUrl: 'http://localhost:3000' }

const POSTING = {
  id: 'p1', source: 'internshala', title: 'Frontend Intern', company: 'Acme', location: 'Pune',
  url: 'https://example.com/p1', descriptionText: 'Build the board with React.', stipend: 'Rs 20,000',
  postedAt: '2026-09-01T00:00:00.000Z', status: null, legitimacy: 'medium', ghostSignals: [],
}

function makeFakeStore() {
  return {
    listPostingsForUser: vi.fn().mockResolvedValue([]),
    getPosting: vi.fn(async (_userId, id) => (id === POSTING.id ? POSTING : null)),
    setPostingStatus: vi.fn(),
    listSources: vi.fn().mockResolvedValue([]),
    getProfile: vi.fn().mockResolvedValue(null),
    getResumeText: vi.fn().mockResolvedValue('JANE DOE RESUME'),
    upsertProfile: vi.fn(async (_userId, fields) => fields),
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

// Which CLIs PATH holds, by name, so a test can install one and not the other.
const installed = (...names) => (name) => (names.includes(name) ? `/usr/local/bin/${name}` : null)

// A machine whose CLIs answer their version probe from memory and every
// prompt with `reply`. `brokenClaude` makes Claude Code's probe fail the way
// a missing shared library does. `home` holds no CLI settings unless a test
// writes some, so the Antigravity gate reads nothing by default.
function machine({ has, reply = '', brokenClaude = false, home = '/no/such/home' }) {
  return {
    locate: installed(...has),
    run: vi.fn(async ({ file, args }) => {
      if (args[0] !== '--version') return { stdout: reply, stderr: '', code: 0 }
      if (brokenClaude && file.endsWith('claude')) return { stdout: '', stderr: 'libnode.so: cannot open shared object file', code: 127 }
      return { stdout: '1.1.22\n', stderr: '', code: 0 }
    }),
    scratch: (work) => work('/scratch'),
    home,
  }
}
const promptCalls = (cli) => cli.run.mock.calls.map((c) => c[0]).filter((c) => c.args[0] !== '--version')

const LETTER = { letter: 'Dear Hiring Team at Acme,\n\nI built the board with React.\n\nRegards', usedFromResume: ['Built the board with React'], notClaimed: [] }
const CLAUDE_LETTER = JSON.stringify({ type: 'result', result: JSON.stringify(LETTER) })
const AGY_LETTER = agyReply(JSON.stringify(LETTER))
const AGY_PROFILE = agyReply('{"skills":["node"],"titles":["backend"],"locations":["pune"],"years":3,"degree":"masters"}')

async function makeApp(store, cli) {
  const app = buildApp({ config, userStore: { upsertUser: vi.fn(), getUserById: vi.fn() }, fetchProfile: vi.fn(), dashboardStore: store })
  app.decorate('cli', cli)
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
  return { app, cookie }
}

async function post(store, cli, url = '/api/postings/p1/ai/cover-letter') {
  const { app, cookie } = await makeApp(store, cli)
  return app.inject({ method: 'POST', url, headers: { cookie } })
}

describe('choosing the CLI for a posting action', () => {
  it('uses Claude Code when both are installed, exactly as before', async () => {
    const cli = machine({ has: ['claude', 'agy'], reply: CLAUDE_LETTER })
    const res = await post(makeFakeStore(), cli)
    expect(res.statusCode).toBe(200)
    expect(res.json().provider).toBe('claude')
    expect(promptCalls(cli)).toHaveLength(1)
    expect(promptCalls(cli)[0]).toMatchObject({ file: '/usr/local/bin/claude', args: CLAUDE.promptArgs('none') })
  })

  it('writes the cover letter with Antigravity when only it is installed, the prompt wrapped on stdin', async () => {
    const store = makeFakeStore()
    const cli = machine({ has: ['agy'], reply: AGY_LETTER })
    const res = await post(store, cli)
    expect(res.statusCode).toBe(200)
    const [call] = promptCalls(cli)
    expect(call.file).toBe('/usr/local/bin/agy')
    expect(call.args).toEqual(AGY.promptArgs('none'))
    expect(call.args).toEqual(['-p=', '--input-format', 'stream-json', '--output-format', 'stream-json', '--disable-slash-commands'])
    expect(call.cwd).toBe('/scratch')
    const line = JSON.parse(call.input)
    expect(line.event).toBe('user')
    expect(line.message.content[0].text).toContain('JANE DOE RESUME')
    expect(line.message.content[0].text).toContain('Build the board with React')
    expect(call.input).toBe(encodeAgyInput(line.message.content[0].text))
    expect(store.setAiResult).toHaveBeenCalledWith('u1', { kind: 'cover-letter', postingId: 'p1', provider: 'agy', result: LETTER, instruction: '' })
    expect(res.json()).toMatchObject({ kind: 'cover-letter', provider: 'agy', createdAt: '2026-09-13T00:00:00.000Z' })
  })

  it('falls through to Antigravity when Claude Code is installed but will not run', async () => {
    const cli = machine({ has: ['claude', 'agy'], reply: AGY_LETTER, brokenClaude: true })
    const res = await post(makeFakeStore(), cli)
    expect(res.statusCode).toBe(200)
    expect(res.json().provider).toBe('agy')
    expect(promptCalls(cli).map((c) => c.file)).toEqual(['/usr/local/bin/agy'])
  })

  // The one action with a browser is the one Antigravity cannot be given.
  it('refuses the fake check with only Antigravity installed, without spawning it, and says what would work', async () => {
    const cli = machine({ has: ['agy'], reply: AGY_LETTER })
    const res = await post(makeFakeStore(), cli, '/api/postings/p1/ai/fake-check')
    expect(res.statusCode).toBe(503)
    expect(res.json().kind).toBe('not_found')
    expect(res.json().error).toMatch(/^This action needs a CLI that can browse/)
    expect(res.json().error).toMatch(/Antigravity's headless mode cannot be given web access without permanent allow-rules in its own config/)
    expect(res.json().error).toMatch(/Claude Code is not installed.*claude\.ai\/code/)
    expect(promptCalls(cli)).toHaveLength(0)
  })

  it('names both CLIs when neither is installed and either would do', async () => {
    const cli = machine({ has: [] })
    const res = await post(makeFakeStore(), cli)
    expect(res.statusCode).toBe(503)
    expect(res.json().kind).toBe('not_found')
    expect(res.json().error).toMatch(/^Neither Claude Code nor Antigravity is installed/)
    expect(res.json().error).toMatch(/claude\.ai\/code.*antigravity\.google/)
    expect(cli.run).not.toHaveBeenCalled()
  })

  it('will not hand the resume to an Antigravity whose settings pre-approve tools, and says so everywhere', async () => {
    const home = mkdtempSync(join(tmpdir(), 'jobdekho-home-'))
    mkdirSync(join(home, '.gemini', 'antigravity-cli'), { recursive: true })
    writeFileSync(join(home, '.gemini', 'antigravity-cli', 'settings.json'), JSON.stringify({ permissions: { allow: ['read_file(*)'] } }))
    try {
      const cli = machine({ has: ['agy'], reply: AGY_LETTER, home })
      const { app, cookie } = await makeApp(makeFakeStore(), cli)
      const res = await app.inject({ method: 'POST', url: '/api/postings/p1/ai/cover-letter', headers: { cookie } })
      expect(res.statusCode).toBe(503)
      expect(res.json().kind).toBe('not_found')
      expect(res.json().error).toMatch(/^Antigravity is installed, but .*read_file\(\*\).*will not hand it your resume/)
      expect(cli.run).not.toHaveBeenCalled()
      const listed = await app.inject({ method: 'GET', url: '/api/ai/providers', headers: { cookie } })
      expect(listed.json().providers.find((p) => p.id === 'agy')).toMatchObject({ present: true, runs: false, version: null, error: res.json().error })
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })
})

describe('choosing the CLI for the resume extraction', () => {
  it('reads the resume with Antigravity when only it is installed', async () => {
    const store = makeFakeStore()
    const cli = machine({ has: ['agy'], reply: AGY_PROFILE })
    const { app, cookie } = await makeApp(store, cli)
    const res = await app.inject({ method: 'POST', url: '/api/profile/extract', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    const [call] = promptCalls(cli)
    expect(call.file).toBe('/usr/local/bin/agy')
    expect(call.args).toEqual(AGY.promptArgs('none'))
    expect(JSON.parse(call.input).message.content[0].text).toContain('JANE DOE RESUME')
    expect(store.upsertProfile).toHaveBeenCalledWith('u1', expect.objectContaining({ skills: ['node'], years: 3, resumeText: 'JANE DOE RESUME' }))
  })

  it('prefers Claude Code for the extraction too when both are installed', async () => {
    const cli = machine({ has: ['claude', 'agy'], reply: JSON.stringify({ type: 'result', result: '{"skills":["react"]}' }) })
    const { app, cookie } = await makeApp(makeFakeStore(), cli)
    const res = await app.inject({ method: 'POST', url: '/api/profile/extract', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    expect(promptCalls(cli).map((c) => c.file)).toEqual(['/usr/local/bin/claude'])
  })
})
