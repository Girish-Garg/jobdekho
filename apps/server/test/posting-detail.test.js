import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'

const config = {
  googleClientId: 'id', googleClientSecret: 'sec', sessionSecret: 'test-secret', baseUrl: 'http://localhost:3000',
}

const POSTING = {
  id: 'p1', title: 'Backend Engineer', descriptionSnippet: 'About us We build',
  descriptionText: 'About us\n\nWe build.\n\nRequirements:\n- Go', status: 'saved', legitimacy: 'high', ghostSignals: [],
}

function makeApp() {
  const dashboardStore = {
    getPosting: vi.fn(async (_userId, id) => (id === POSTING.id ? POSTING : null)),
  }
  const app = buildApp({ config, userStore: { upsertUser: vi.fn(), getUserById: vi.fn() }, fetchProfile: vi.fn(), dashboardStore })
  return { app, dashboardStore }
}

async function signedCookie(app) {
  await app.ready()
  return `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
}

// The feed sends a 280-character snippet; the pane needs the whole body, and
// this is the only route that hands it to the browser.
describe('GET /api/postings/:id', () => {
  it('returns 401 without a cookie', async () => {
    const { app } = makeApp(); await app.ready()
    const res = await app.inject({ method: 'GET', url: '/api/postings/p1' })
    expect(res.statusCode).toBe(401)
  })

  it('returns the whole posting, full description included, for the signed-in user', async () => {
    const { app, dashboardStore } = makeApp()
    const res = await app.inject({ method: 'GET', url: '/api/postings/p1', headers: { cookie: await signedCookie(app) } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ posting: POSTING })
    expect(dashboardStore.getPosting).toHaveBeenCalledWith('u1', 'p1')
  })

  // A scrape can drop a posting the person still has open.
  it('returns 404 for a posting the corpus no longer has', async () => {
    const { app } = makeApp()
    const res = await app.inject({ method: 'GET', url: '/api/postings/gone', headers: { cookie: await signedCookie(app) } })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'no such posting' })
  })
})
