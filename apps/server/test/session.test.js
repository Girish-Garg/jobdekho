import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import { issueSession, requireAuth } from '@jobdekho/server/auth/session.js'

async function makeApp() {
  const app = Fastify()
  await app.register(cookie)
  await app.register(jwt, { secret: 'test-secret' })
  app.post('/login', async (req, reply) => { issueSession(reply, { id: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null }); return reply.send({ ok: true }) })
  app.get('/guarded', { preHandler: requireAuth }, async (req) => ({ user: req.user.sub }))
  await app.ready()
  return app
}

describe('session', () => {
  it('issues a session cookie that authorizes a guarded route', async () => {
    const app = await makeApp()
    const login = await app.inject({ method: 'POST', url: '/login' })
    const setCookie = login.headers['set-cookie']
    expect(setCookie).toMatch(/session=/)
    const cookieHeader = String(setCookie).split(';')[0]
    const guarded = await app.inject({ method: 'GET', url: '/guarded', headers: { cookie: cookieHeader } })
    expect(guarded.statusCode).toBe(200)
    expect(guarded.json().user).toBe('u1')
  })
  it('rejects a guarded route with no cookie', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'GET', url: '/guarded' })
    expect(res.statusCode).toBe(401)
  })
})
