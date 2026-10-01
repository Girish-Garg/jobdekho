import { describe, it, expect, afterEach } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'
import { loadConfig } from '@jobdekho/server/config.js'

const apps = []
afterEach(async () => {
  for (const app of apps.splice(0)) await app.close()
})

async function makeApp(config) {
  const app = buildApp({ config: { sessionSecret: 'test-secret', devUserId: 'u1', ...config }, dashboardStore: {} })
  await app.ready()
  apps.push(app)
  return app
}

// Switched off until it is taken up again (see config.js): nothing of it
// answers, so nobody can open a browser through it.
describe('Apply assist, switched off', () => {
  it('is off unless JOBDEKHO_APPLY_ASSIST=1', () => {
    expect(loadConfig({}).applyAssist).toBe(false)
    expect(loadConfig({ JOBDEKHO_APPLY_ASSIST: '1' }).applyAssist).toBe(true)
  })

  it('has no routes at all while off', async () => {
    const app = await makeApp({})
    for (const [method, url] of [['GET', '/api/apply/browser'], ['POST', '/api/apply/sessions'], ['GET', '/api/apply/copy/p1'], ['DELETE', '/api/apply/sign-ins']]) {
      expect((await app.inject({ method, url, payload: method === 'POST' ? {} : undefined })).statusCode).toBe(404)
    }
  })

  it('answers again once switched on', async () => {
    const app = await makeApp({ applyAssist: true })
    expect((await app.inject({ url: '/api/apply/sign-in-window' })).statusCode).toBe(200)
  })
})
