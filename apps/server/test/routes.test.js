import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import { authRoutes } from '@jobdekho/server/auth/routes.js'

async function makeApp() {
  const app = Fastify()
  await app.register(cookie)
  await app.register(jwt, { secret: 'test-secret' })
  await app.register(authRoutes)
  await app.ready()
  return app
}

describe('auth routes', () => {
  it('healthz returns ok', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'GET', url: '/healthz' })
    expect(res.json()).toEqual({ ok: true })
  })
  it('me returns 401 without a session', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'GET', url: '/auth/me' })
    expect(res.statusCode).toBe(401)
  })
  it('me returns the user with a valid session cookie', async () => {
    const app = await makeApp()
    const token = app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })
    const res = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie: `session=${token}` } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ id: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })
  })
  it('logout clears the cookie and returns 204', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'POST', url: '/auth/logout' })
    expect(res.statusCode).toBe(204)
    expect(String(res.headers['set-cookie'])).toMatch(/session=;|session=;/)
  })
})
