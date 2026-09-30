import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'
import { SEARCH_PATH } from '@jobdekho/server/ai/ollama-web-tools.js'

const config = { sessionSecret: 'test-secret', devUserId: 'local' }

// Claude Code and Ollama on PATH, answering their probes; Ollama with a
// model that uses tools and signed in, so it can search. Every seam is a
// fake: no real CLI, model server, PATH, LaTeX or data file is touched.
function everythingInstalled() {
  const at = { claude: '/bin/claude', ollama: '/bin/ollama' }
  const routes = {
    'GET /api/version': { status: 200, body: { version: '0.32.12' } },
    'GET /api/tags': { status: 200, body: { models: [{ name: 'qwen3:4b', size: 2500000000, capabilities: ['completion', 'tools'] }] } },
    [`POST ${SEARCH_PATH}`]: { status: 400, body: { error: 'missing request body' } },
    'GET /api/status': { status: 200, body: {} },
    'POST /api/me': { status: 200, body: {} },
  }
  return {
    locate: vi.fn((name) => at[name] ?? null),
    run: vi.fn(async () => ({ stdout: '2.1.281 (Claude Code)\n', stderr: '', code: 0 })),
    http: vi.fn(async ({ url, method = 'GET' }) => routes[`${method} ${new URL(url).pathname}`] ?? { status: 404, body: null }),
    home: '/nowhere',
  }
}

const nothingInstalled = () => ({
  locate: vi.fn(() => null),
  run: vi.fn(async () => { throw new Error('a test spawned a CLI') }),
  home: '/nowhere',
})

async function makeApp({
  cfg = config, cli = everythingInstalled(), latexPath = '/usr/bin/pdflatex', runs = [],
  profile = { skills: ['react'], titles: [], years: null }, sources = [{ name: 'lever', count: 12 }],
} = {}) {
  const dashboard = {
    getProfile: vi.fn(async () => profile),
    listSources: vi.fn(async () => sources),
    getProviderPref: vi.fn(async () => null),
  }
  const store = { runs: { all: vi.fn(() => runs) } }
  const latexLocate = vi.fn(() => latexPath)
  const app = buildApp({ config: cfg, dashboardStore: dashboard })
  app.decorate('cli', cli)
  app.decorate('setupStore', store)
  app.decorate('latexLocate', latexLocate)
  await app.ready()
  return { app, dashboard, store, cli, latexLocate }
}

const stateOf = (res) => Object.fromEntries(res.json().checks.map((c) => [c.id, c.state]))

describe('GET /api/setup', () => {
  it('returns 401 without an identity', async () => {
    const { app } = await makeApp({ cfg: { sessionSecret: 'test-secret' } })
    const res = await app.inject({ method: 'GET', url: '/api/setup' })
    expect(res.statusCode).toBe(401)
  })

  it('reports every check ok on a machine with everything in place', async () => {
    const { app, dashboard, latexLocate } = await makeApp({ runs: [{ id: 'r', startedAt: new Date().toISOString() }] })
    const res = await app.inject({ method: 'GET', url: '/api/setup' })
    expect(res.statusCode).toBe(200)
    expect(stateOf(res)).toEqual({ ai: 'ok', latex: 'ok', profile: 'ok', postings: 'ok', web: 'ok', ollama: 'ok' })
    const byId = Object.fromEntries(res.json().checks.map((c) => [c.id, c]))
    expect(byId.ai.detail).toMatch(/^Claude Code and Ollama run here/)
    expect(byId.web.detail).toMatch(/^Claude Code and Ollama can search the web/)
    expect(byId.postings.detail).toBe('12 postings stored, last refreshed today.')
    expect(dashboard.getProfile).toHaveBeenCalledWith('local')
    expect(latexLocate).toHaveBeenCalled()
  })

  it('reports what is missing on a fresh machine, with the optional ones never missing', async () => {
    const { app } = await makeApp({ cli: nothingInstalled(), latexPath: null, profile: null, sources: [] })
    const res = await app.inject({ method: 'GET', url: '/api/setup' })
    expect(stateOf(res)).toEqual({ ai: 'missing', latex: 'missing', profile: 'missing', postings: 'missing', web: 'optional', ollama: 'optional' })
    for (const check of res.json().checks) {
      expect(Object.keys(check).sort()).toEqual(['detail', 'fix', 'id', 'label', 'state'])
      expect(typeof check.fix).toBe('string')
    }
  })

  it('says Ollama is installed but not running when its server does not answer', async () => {
    const cli = { ...everythingInstalled(), http: vi.fn(async () => { throw Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }) }) }
    const { app } = await makeApp({ cli })
    const check = (await app.inject({ method: 'GET', url: '/api/setup' })).json().checks.find((c) => c.id === 'ollama')
    expect(check.state).toBe('optional')
    expect(check.fix).toMatch(/installed but not running/)
  })

  it('reads the cached detection, and probes again only when asked to', async () => {
    const { app, cli } = await makeApp()
    await app.inject({ method: 'GET', url: '/api/setup' })
    await app.inject({ method: 'GET', url: '/api/setup' })
    expect(cli.run).toHaveBeenCalledTimes(1)
    await app.inject({ method: 'GET', url: '/api/setup?refresh=true' })
    expect(cli.run).toHaveBeenCalledTimes(2)
  })

  it('never asks a model anything', async () => {
    const { app, cli } = await makeApp()
    await app.inject({ method: 'GET', url: '/api/setup?refresh=true' })
    const paths = cli.http.mock.calls.map(([{ url }]) => new URL(url).pathname)
    expect(paths).not.toContain('/api/generate')
    expect(paths).not.toContain('/api/chat')
    for (const [{ args }] of cli.run.mock.calls) expect(args).toEqual(['--version'])
  })
})
