import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'

const config = { sessionSecret: 'test-secret', devUserId: 'local' }

function makeFakeStore() {
  return {
    getProviderPref: vi.fn().mockResolvedValue(null),
    upsertProviderPref: vi.fn().mockResolvedValue(undefined),
  }
}

// Ollama found on PATH with its server answering, listing `models`; nothing
// else is installed. A fake throughout: no real CLI or model server is asked.
function ollamaWith(models) {
  const tags = { models: models.map((name) => ({ name, size: 2019393189, details: { context_length: 131072 }, capabilities: ['completion'] })) }
  return {
    locate: (name) => (name === 'ollama' ? '/usr/local/bin/ollama' : null),
    run: vi.fn(async () => { throw new Error('a test spawned a CLI') }),
    http: vi.fn(async ({ url }) => ({ status: 200, body: url.endsWith('/api/tags') ? tags : { version: '0.32.12' } })),
  }
}

// Claude Code and Antigravity installed, answering the version probe, with
// Antigravity's own model listing (see agy-models.js) answering `listing`.
function clisWith(listing) {
  return {
    locate: (name) => (name === 'ollama' ? null : `/usr/local/bin/${name}`),
    run: vi.fn(async () => ({ stdout: '1.2.14\n', stderr: '', code: 0 })),
    listRun: vi.fn(async () => ({ stdout: listing, stderr: 'Fetching available models...\n', code: 0 })),
  }
}

async function makeApp(store = makeFakeStore(), cfg = config, cli = null) {
  const app = buildApp({ config: cfg, dashboardStore: store })
  if (cli) app.decorate('cli', cli)
  await app.ready()
  return { app, store }
}

const put = (app, body) => app.inject({
  method: 'PUT', url: '/api/ai/provider', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
})

describe('GET /api/ai/provider', () => {
  it('returns 401 without an identity', async () => {
    const { app } = await makeApp(makeFakeStore(), { sessionSecret: 'test-secret' })
    const res = await app.inject({ method: 'GET', url: '/api/ai/provider' })
    expect(res.statusCode).toBe(401)
  })

  it('defaults to auto when nothing is saved', async () => {
    const { app } = await makeApp()
    const res = await app.inject({ method: 'GET', url: '/api/ai/provider' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ provider: 'auto', models: {} })
  })

  it('returns the saved preference', async () => {
    const store = makeFakeStore()
    store.getProviderPref.mockResolvedValue({ provider: 'claude' })
    const { app } = await makeApp(store)
    const res = await app.inject({ method: 'GET', url: '/api/ai/provider' })
    expect(res.json()).toEqual({ provider: 'claude' })
  })
})

describe('PUT /api/ai/provider', () => {
  it('saves a known provider id and returns 204', async () => {
    const store = makeFakeStore()
    const { app } = await makeApp(store)
    const res = await app.inject({
      method: 'PUT', url: '/api/ai/provider',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'agy' }),
    })
    expect(res.statusCode).toBe(204)
    expect(store.upsertProviderPref).toHaveBeenCalledWith('local', { provider: 'agy', models: {} })
  })

  it('accepts auto, the "whichever is available" choice', async () => {
    const store = makeFakeStore()
    const { app } = await makeApp(store)
    const res = await app.inject({
      method: 'PUT', url: '/api/ai/provider',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'auto' }),
    })
    expect(res.statusCode).toBe(204)
  })

  it('rejects a provider id the registry does not know', async () => {
    const store = makeFakeStore()
    const { app } = await makeApp(store)
    const res = await app.inject({
      method: 'PUT', url: '/api/ai/provider',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'chatgpt' }),
    })
    expect(res.statusCode).toBe(400)
    expect(store.upsertProviderPref).not.toHaveBeenCalled()
  })
})

describe('a model for each AI', () => {
  it('returns the saved models with the provider', async () => {
    const store = makeFakeStore()
    store.getProviderPref.mockResolvedValue({ provider: 'ollama', models: { ollama: 'qwen3:8b', claude: 'opus' } })
    const { app } = await makeApp(store)
    const res = await app.inject({ method: 'GET', url: '/api/ai/provider' })
    expect(res.json()).toEqual({ provider: 'ollama', models: { ollama: 'qwen3:8b', claude: 'opus' } })
  })

  it('accepts Ollama as the provider, since the registry knows it', async () => {
    const store = makeFakeStore()
    const { app } = await makeApp(store)
    expect((await put(app, { provider: 'ollama' })).statusCode).toBe(204)
    expect(store.upsertProviderPref).toHaveBeenCalledWith('local', { provider: 'ollama', models: {} })
  })

  it('saves a model Ollama has installed, keeping the saved provider and the other models', async () => {
    const store = makeFakeStore()
    store.getProviderPref.mockResolvedValue({ provider: 'claude', models: { claude: 'sonnet' } })
    const { app } = await makeApp(store, config, ollamaWith(['llama3.2:3b', 'qwen3:8b']))
    expect((await put(app, { models: { ollama: 'qwen3:8b' } })).statusCode).toBe(204)
    expect(store.upsertProviderPref).toHaveBeenCalledWith('local', { provider: 'claude', models: { claude: 'sonnet', ollama: 'qwen3:8b' } })
  })

  // Settings saves each as it is picked, so a provider pick must not drop
  // the models picked before it.
  it('keeps the saved models when only the provider changes', async () => {
    const store = makeFakeStore()
    store.getProviderPref.mockResolvedValue({ provider: 'auto', models: { ollama: 'qwen3:8b' } })
    const { app } = await makeApp(store)
    expect((await put(app, { provider: 'agy' })).statusCode).toBe(204)
    expect(store.upsertProviderPref).toHaveBeenCalledWith('local', { provider: 'agy', models: { ollama: 'qwen3:8b' } })
  })

  it('refuses a model Ollama does not have, after asking it again in case it was just pulled', async () => {
    const store = makeFakeStore()
    const cli = ollamaWith(['llama3.2:3b'])
    const { app } = await makeApp(store, config, cli)
    const res = await put(app, { models: { ollama: 'gpt-oss:120b-cloud' } })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('Ollama has no model called "gpt-oss:120b-cloud" on this computer. Pick one of the models it lists.')
    expect(store.upsertProviderPref).not.toHaveBeenCalled()
    const tagReads = cli.http.mock.calls.filter(([req]) => req.url.endsWith('/api/tags'))
    expect(tagReads).toHaveLength(2)
  })

  it('refuses any Ollama model while Ollama is not running', async () => {
    const store = makeFakeStore()
    const cli = { ...ollamaWith([]), http: vi.fn(async () => { throw Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }) }) }
    const { app } = await makeApp(store, config, cli)
    expect((await put(app, { models: { ollama: 'llama3.2:3b' } })).statusCode).toBe(400)
    expect(store.upsertProviderPref).not.toHaveBeenCalled()
  })

  it('rejects an empty model name or an unknown AI before looking, and a model that is not a string', async () => {
    const store = makeFakeStore()
    const cli = ollamaWith(['llama3.2:3b'])
    const { app } = await makeApp(store, config, cli)
    expect((await put(app, { models: { ollama: '' } })).statusCode).toBe(400)
    expect((await put(app, { models: { chatgpt: 'gpt-5' } })).statusCode).toBe(400)
    expect(cli.http).not.toHaveBeenCalled()
    expect((await put(app, { models: { claude: 7 } })).statusCode).toBe(400)
    expect(store.upsertProviderPref).not.toHaveBeenCalled()
  })

  // Claude Code's list is fixed, so nothing is started to check it.
  it('saves a Claude Code alias it lists, Default among them, and refuses a name it does not', async () => {
    const store = makeFakeStore()
    const cli = clisWith('')
    const { app } = await makeApp(store, config, cli)
    expect((await put(app, { models: { claude: 'haiku' } })).statusCode).toBe(204)
    expect(store.upsertProviderPref).toHaveBeenLastCalledWith('local', { models: { claude: 'haiku' } })
    expect((await put(app, { models: { claude: 'default' } })).statusCode).toBe(204)
    const res = await put(app, { models: { claude: 'opus --dangerously-skip-permissions' } })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('Claude Code does not offer a model called "opus --dangerously-skip-permissions". Pick one of the models it lists.')
  })

  it('saves an Antigravity model its own listing names, and refuses one it does not', async () => {
    const store = makeFakeStore()
    const cli = clisWith('gemini-3.8-flash-low\tGemini 3.8 Flash (Low)\nclaude-sonnet-4-6\tClaude Sonnet 4.6 (Thinking)\n')
    const { app } = await makeApp(store, config, cli)
    expect((await put(app, { models: { agy: 'claude-sonnet-4-6' } })).statusCode).toBe(204)
    expect(store.upsertProviderPref).toHaveBeenLastCalledWith('local', { models: { agy: 'claude-sonnet-4-6' } })
    const res = await put(app, { models: { agy: 'gemini-9-ultra' } })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('Antigravity does not offer a model called "gemini-9-ultra". Pick one of the models it lists.')
    expect(cli.listRun.mock.calls.every(([c]) => c.args.join(' ') === 'models')).toBe(true)
  })
})
