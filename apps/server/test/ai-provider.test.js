import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'

const config = { sessionSecret: 'test-secret', devUserId: 'local' }

function makeFakeStore() {
  return {
    getProviderPref: vi.fn().mockResolvedValue(null),
    upsertProviderPref: vi.fn().mockResolvedValue(undefined),
  }
}

async function makeApp(store = makeFakeStore(), cfg = config) {
  const app = buildApp({ config: cfg, dashboardStore: store })
  await app.ready()
  return { app, store }
}

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
