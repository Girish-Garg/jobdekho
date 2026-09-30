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
    expect(res.json()).toEqual({ provider: 'auto' })
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
    expect(store.upsertProviderPref).toHaveBeenCalledWith('local', { provider: 'agy' })
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

describe('the Ollama model beside the provider', () => {
  it('returns the saved model with the provider', async () => {
    const store = makeFakeStore()
    store.getProviderPref.mockResolvedValue({ provider: 'ollama', ollamaModel: 'qwen3:8b' })
    const { app } = await makeApp(store)
    const res = await app.inject({ method: 'GET', url: '/api/ai/provider' })
    expect(res.json()).toEqual({ provider: 'ollama', ollamaModel: 'qwen3:8b' })
  })

  it('accepts Ollama as the provider, since the registry knows it', async () => {
    const store = makeFakeStore()
    const { app } = await makeApp(store)
    expect((await put(app, { provider: 'ollama' })).statusCode).toBe(204)
    expect(store.upsertProviderPref).toHaveBeenCalledWith('local', { provider: 'ollama' })
  })

  it('saves a model Ollama has installed, keeping the saved provider', async () => {
    const store = makeFakeStore()
    store.getProviderPref.mockResolvedValue({ provider: 'claude' })
    const { app } = await makeApp(store, config, ollamaWith(['llama3.2:3b', 'qwen3:8b']))
    expect((await put(app, { ollamaModel: 'qwen3:8b' })).statusCode).toBe(204)
    expect(store.upsertProviderPref).toHaveBeenCalledWith('local', { provider: 'claude', ollamaModel: 'qwen3:8b' })
  })

  // Settings saves each as it is picked, so a provider pick must not drop
  // the model picked before it.
  it('keeps the saved model when only the provider changes', async () => {
    const store = makeFakeStore()
    store.getProviderPref.mockResolvedValue({ provider: 'auto', ollamaModel: 'qwen3:8b' })
    const { app } = await makeApp(store)
    expect((await put(app, { provider: 'agy' })).statusCode).toBe(204)
    expect(store.upsertProviderPref).toHaveBeenCalledWith('local', { provider: 'agy', ollamaModel: 'qwen3:8b' })
  })

  it('refuses a model Ollama does not have, after asking it again in case it was just pulled', async () => {
    const store = makeFakeStore()
    const cli = ollamaWith(['llama3.2:3b'])
    const { app } = await makeApp(store, config, cli)
    const res = await put(app, { ollamaModel: 'gpt-oss:120b-cloud' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('Ollama has no model called "gpt-oss:120b-cloud" on this computer. Pick one of the models it lists.')
    expect(store.upsertProviderPref).not.toHaveBeenCalled()
    const tagReads = cli.http.mock.calls.filter(([req]) => req.url.endsWith('/api/tags'))
    expect(tagReads).toHaveLength(2)
  })

  it('refuses any model while Ollama is not running', async () => {
    const store = makeFakeStore()
    const cli = { ...ollamaWith([]), http: vi.fn(async () => { throw Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }) }) }
    const { app } = await makeApp(store, config, cli)
    expect((await put(app, { ollamaModel: 'llama3.2:3b' })).statusCode).toBe(400)
    expect(store.upsertProviderPref).not.toHaveBeenCalled()
  })

  it('rejects an empty model name before looking', async () => {
    const store = makeFakeStore()
    const cli = ollamaWith(['llama3.2:3b'])
    const { app } = await makeApp(store, config, cli)
    expect((await put(app, { ollamaModel: '' })).statusCode).toBe(400)
    expect(cli.http).not.toHaveBeenCalled()
  })
})
