import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import { authRoutes } from '@jobdekho/server/auth/routes.js'

async function makeApp() {
  const app = Fastify()
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
})
