import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import { requireAuth } from '@jobdekho/server/auth/session.js'

async function makeApp() {
  const app = Fastify()
  await app.register(cookie)
  await app.register(jwt, { secret: 'test-secret' })
  app.get('/guarded', { preHandler: requireAuth }, async (req) => ({ user: req.user.sub }))
  await app.ready()
  return app
}

describe('session', () => {
  // Nothing in the app issues this cookie any more (sign-in was removed with
  // Google OAuth), but currentUser() still honours one if it is there.
  it('authorizes a guarded route from a valid session cookie', async () => {
    const app = await makeApp()
    const token = app.jwt.sign({ sub: 'u1' })
    const res = await app.inject({ method: 'GET', url: '/guarded', headers: { cookie: `session=${token}` } })
    expect(res.statusCode).toBe(200)
    expect(res.json().user).toBe('u1')
  })

  it('rejects a guarded route with no cookie', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'GET', url: '/guarded' })
    expect(res.statusCode).toBe(401)
  })

  it('rejects a guarded route with a cookie that does not verify', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'GET', url: '/guarded', headers: { cookie: 'session=not-a-token' } })
    expect(res.statusCode).toBe(401)
  })
})
