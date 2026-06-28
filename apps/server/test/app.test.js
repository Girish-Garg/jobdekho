import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'

const config = { googleClientId: 'id', googleClientSecret: 'sec', sessionSecret: 'test-secret', baseUrl: 'http://localhost:3000' }

function makeApp() {
  const userStore = { upsertUser: vi.fn(), getUserById: vi.fn() }
  return buildApp({ config, userStore, fetchProfile: vi.fn() })
}

describe('buildApp', () => {
  it('serves healthz', async () => {
    const app = makeApp(); await app.ready()
    const res = await app.inject({ method: 'GET', url: '/healthz' })
    expect(res.json()).toEqual({ ok: true })
  })
  it('starts the google oauth redirect', async () => {
    const app = makeApp(); await app.ready()
    const res = await app.inject({ method: 'GET', url: '/auth/google' })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toMatch(/accounts\.google\.com/)
  })
  it('round-trips a session through /auth/me', async () => {
    const app = makeApp(); await app.ready()
    const token = app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })
    const res = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie: `session=${token}` } })
    expect(res.statusCode).toBe(200)
    expect(res.json().id).toBe('u1')
  })
})
