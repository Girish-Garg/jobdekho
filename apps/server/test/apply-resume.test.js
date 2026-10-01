import { describe, it, expect, vi, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from '@jobdekho/server/app.js'

const config = { sessionSecret: 'test-secret', devUserId: 'u1' }
const ON_BOARD = { id: 'b1', source: 'instahyre', title: 'SDE - 2 (Full Stack)', company: 'Writesonic', url: 'https://www.instahyre.com/job-1' }

const apps = []
const dirs = []
afterEach(async () => {
  for (const app of apps.splice(0)) await app.close()
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

async function makeApp({ resume = null } = {}) {
  const dashboard = {
    getPosting: vi.fn(async (_u, id) => ({ b1: ON_BOARD })[id] ?? null),
    getProfile: vi.fn(async () => ({ basics: { name: 'Demo Candidate', email: 'demo@example.com' } })),
    getAiResult: vi.fn(async () => null),
    originalResumePath: () => resume,
  }
  const app = buildApp({ config, dashboardStore: dashboard })
  app.decorate('applyDeps', { findBrowser: () => null, windowMode: () => 'offscreen' })
  app.decorate('applyRegistry', { closeAll: async () => {} })
  await app.ready()
  apps.push(app)
  return app
}

describe('the resume to attach by hand', () => {
  it('serves the uploaded resume to attach by hand, and says when there is none', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'jobdekho-resume-'))
    dirs.push(dir)
    const file = join(dir, 'original-resume.pdf')
    writeFileSync(file, '%PDF-1.4 demo')
    const withResume = await makeApp({ resume: file })
    expect((await withResume.inject({ url: '/api/apply/copy/b1' })).json()).toMatchObject({ hasResume: true })
    const res = await withResume.inject({ url: '/api/apply/resume' })
    expect(res.headers['content-type']).toMatch(/application\/pdf/)
    expect(res.headers['content-disposition']).toMatch(/attachment/)
    expect(res.body).toBe('%PDF-1.4 demo')
    const without = await makeApp()
    expect((await without.inject({ url: '/api/apply/copy/b1' })).json()).toMatchObject({ hasResume: false })
    expect((await without.inject({ url: '/api/apply/resume' })).statusCode).toBe(404)
  })
})
