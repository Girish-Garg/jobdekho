import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'

const config = {
  googleClientId: 'id',
  googleClientSecret: 'sec',
  sessionSecret: 'test-secret',
  baseUrl: 'http://localhost:3000',
}

function makeFakeStore() {
  return {
    listPostingsForUser: vi.fn().mockResolvedValue([]),
    setPostingStatus: vi.fn().mockResolvedValue(undefined),
    getUserFilters: vi.fn().mockResolvedValue(null),
    upsertUserFilters: vi.fn().mockResolvedValue(undefined),
    getNotificationPrefs: vi.fn().mockResolvedValue(null),
    upsertNotificationPrefs: vi.fn().mockResolvedValue(undefined),
  }
}

function makeApp(store) {
  const userStore = { upsertUser: vi.fn(), getUserById: vi.fn() }
  return buildApp({ config, userStore, fetchProfile: vi.fn(), dashboardStore: store })
}

async function signedCookie(app) {
  await app.ready()
  const token = app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })
  return `session=${token}`
}

describe('GET /api/postings', () => {
  it('returns 401 without cookie', async () => {
    const app = makeApp(makeFakeStore()); await app.ready()
    const res = await app.inject({ method: 'GET', url: '/api/postings' })
    expect(res.statusCode).toBe(401)
  })

  it('returns { postings } for authenticated user', async () => {
    const store = makeFakeStore()
    store.listPostingsForUser.mockResolvedValue([{ id: '1', title: 'Dev', status: null }])
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({ method: 'GET', url: '/api/postings', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ postings: [{ id: '1', title: 'Dev', status: null }] })
    expect(store.listPostingsForUser).toHaveBeenCalledWith('u1', { source: undefined, q: undefined, status: undefined })
  })

  it('maps ?status=new to null in store call', async () => {
    const store = makeFakeStore()
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    await app.inject({ method: 'GET', url: '/api/postings?status=new', headers: { cookie } })
    expect(store.listPostingsForUser).toHaveBeenCalledWith('u1', { source: undefined, q: undefined, status: null })
  })

  it('passes literal status values through', async () => {
    const store = makeFakeStore()
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    await app.inject({ method: 'GET', url: '/api/postings?status=saved&source=naukri&q=react', headers: { cookie } })
    expect(store.listPostingsForUser).toHaveBeenCalledWith('u1', { source: 'naukri', q: 'react', status: 'saved' })
  })
})

describe('PATCH /api/postings/:id', () => {
  it('returns 401 without cookie', async () => {
    const app = makeApp(makeFakeStore()); await app.ready()
    const res = await app.inject({ method: 'PATCH', url: '/api/postings/p1', body: { status: 'saved' } })
    expect(res.statusCode).toBe(401)
  })

  it('calls setPostingStatus and returns 204', async () => {
    const store = makeFakeStore()
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({
      method: 'PATCH', url: '/api/postings/p1',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'applied' }),
    })
    expect(res.statusCode).toBe(204)
    expect(store.setPostingStatus).toHaveBeenCalledWith('u1', 'p1', 'applied')
  })
})

describe('GET /api/filters', () => {
  it('returns 401 without cookie', async () => {
    const app = makeApp(makeFakeStore()); await app.ready()
    const res = await app.inject({ method: 'GET', url: '/api/filters' })
    expect(res.statusCode).toBe(401)
  })

  it('falls back to global defaults when store returns null', async () => {
    const store = makeFakeStore() // getUserFilters returns null
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({ method: 'GET', url: '/api/filters', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.includeKeywords)).toBe(true)
    expect(Array.isArray(body.excludeKeywords)).toBe(true)
    expect(Array.isArray(body.locations)).toBe(true)
    expect(body.includeKeywords.length).toBeGreaterThan(0)
  })

  it('returns user filters when available', async () => {
    const store = makeFakeStore()
    store.getUserFilters.mockResolvedValue({ includeKeywords: ['react'], excludeKeywords: [], locations: ['remote'] })
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({ method: 'GET', url: '/api/filters', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ includeKeywords: ['react'], excludeKeywords: [], locations: ['remote'] })
  })
})

describe('PUT /api/filters', () => {
  it('returns 401 without cookie', async () => {
    const app = makeApp(makeFakeStore()); await app.ready()
    const res = await app.inject({ method: 'PUT', url: '/api/filters', body: {} })
    expect(res.statusCode).toBe(401)
  })

  it('calls upsertUserFilters and returns 204', async () => {
    const store = makeFakeStore()
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const filters = { includeKeywords: ['node'], excludeKeywords: ['senior'], locations: ['remote'] }
    const res = await app.inject({
      method: 'PUT', url: '/api/filters',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify(filters),
    })
    expect(res.statusCode).toBe(204)
    expect(store.upsertUserFilters).toHaveBeenCalledWith('u1', filters)
  })
})

describe('GET /api/notifications', () => {
  it('returns 401 without cookie', async () => {
    const app = makeApp(makeFakeStore()); await app.ready()
    const res = await app.inject({ method: 'GET', url: '/api/notifications' })
    expect(res.statusCode).toBe(401)
  })

  it('returns defaults when store returns null', async () => {
    const store = makeFakeStore()
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({ method: 'GET', url: '/api/notifications', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ channel: 'none', telegramChatId: null, email: null, enabled: true })
  })

  it('returns user prefs when available', async () => {
    const store = makeFakeStore()
    store.getNotificationPrefs.mockResolvedValue({ channel: 'telegram', telegramChatId: '123', email: null, enabled: true })
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({ method: 'GET', url: '/api/notifications', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    expect(res.json().channel).toBe('telegram')
  })
})

describe('PUT /api/notifications', () => {
  it('returns 401 without cookie', async () => {
    const app = makeApp(makeFakeStore()); await app.ready()
    const res = await app.inject({ method: 'PUT', url: '/api/notifications', body: {} })
    expect(res.statusCode).toBe(401)
  })

  it('calls upsertNotificationPrefs and returns 204', async () => {
    const store = makeFakeStore()
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const prefs = { channel: 'email', telegramChatId: null, email: 'a@b.c', enabled: true }
    const res = await app.inject({
      method: 'PUT', url: '/api/notifications',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify(prefs),
    })
    expect(res.statusCode).toBe(204)
    expect(store.upsertNotificationPrefs).toHaveBeenCalledWith('u1', prefs)
  })
})
