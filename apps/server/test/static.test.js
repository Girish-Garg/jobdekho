import { describe, it, expect } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'

const config = {
  googleClientId: 'id',
  googleClientSecret: 'sec',
  sessionSecret: 'test-secret',
  baseUrl: 'http://localhost:3000',
}

function makeApp(distDir) {
  const userStore = { upsertUser: vi.fn(), getUserById: vi.fn() }
  return buildApp({ config, userStore, fetchProfile: vi.fn(), distDir })
}

import { vi } from 'vitest'

describe('registerStatic with missing distDir', () => {
  it('app builds and unknown route returns 404', async () => {
    const app = makeApp('/nonexistent/path/dist')
    await app.ready()
    const res = await app.inject({ method: 'GET', url: '/some-unknown-page' })
    expect(res.statusCode).toBe(404)
  })

  it('api routes still work when distDir is absent', async () => {
    const app = makeApp('/nonexistent/path/dist')
    await app.ready()
    const res = await app.inject({ method: 'GET', url: '/api/postings' })
    expect(res.statusCode).toBe(401)
  })
})
