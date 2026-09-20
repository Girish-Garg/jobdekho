import { describe, it, expect } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'

const config = { sessionSecret: 'test-secret' }

describe('buildApp', () => {
  it('serves healthz', async () => {
    const app = buildApp({ config })
    await app.ready()
    const res = await app.inject({ method: 'GET', url: '/healthz' })
    expect(res.json()).toEqual({ ok: true })
  })

  it('rejects a guarded api route with no identity at all', async () => {
    const app = buildApp({ config })
    await app.ready()
    const res = await app.inject({ method: 'GET', url: '/api/filters' })
    expect(res.statusCode).toBe(401)
  })

  // The only identity JobDekho has left: every request runs as this user,
  // with no cookie and no sign-in step.
  it('runs every request as the local user when DEV_AUTH_USER_ID is set', async () => {
    const dashboardStore = { getUserFilters: async () => ({ includeKeywords: ['react'] }) }
    const app = buildApp({ config: { ...config, devUserId: 'local' }, dashboardStore })
    await app.ready()
    const res = await app.inject({ method: 'GET', url: '/api/filters' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ includeKeywords: ['react'] })
  })
})
