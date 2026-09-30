import { describe, it, expect, vi, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from '@jobdekho/server/app.js'
import { sameTitle, sameJobElsewhere } from '@jobdekho/server/apply/same-job.js'

const config = { sessionSecret: 'test-secret', devUserId: 'u1' }

// The same job as a board lists it and as the company's own board does.
const ON_BOARD = { id: 'b1', source: 'instahyre', title: 'SDE - 2 (Full Stack)', company: 'WRITESONIC PRIVATE LIMITED', url: 'https://www.instahyre.com/job-1' }
const OWN = { id: 'c1', source: 'lever:writesonic', title: 'SDE 2, Full Stack (Remote)', company: 'Writesonic', url: 'https://jobs.lever.co/writesonic/1' }
const OTHER_TITLE = { ...OWN, id: 'c2', title: 'Frontend Developer' }
const OTHER_BOARD = { ...OWN, id: 'c3', source: 'linkedin', url: 'https://in.linkedin.com/jobs/view/9' }

describe('sameTitle', () => {
  it('meets one job written two ways, and keeps two jobs apart', () => {
    expect(sameTitle('SDE - 2 (Full Stack)', 'SDE 2, Full Stack (Remote)')).toBe(true)
    expect(sameTitle('Software Engineer - React Native', 'Software Engineer, React Native')).toBe(true)
    expect(sameTitle('Full Stack Developer', 'Frontend Developer')).toBe(false)
    expect(sameTitle('SDE 1', 'SDE 2')).toBe(false)
    expect(sameTitle('', 'SDE 2')).toBe(false)
  })
})

describe('sameJobElsewhere', () => {
  it('finds the company listing the same job itself, and nothing on another board', async () => {
    const dashboard = { listPostingsForUser: vi.fn(async () => [ON_BOARD, OTHER_BOARD, OTHER_TITLE, OWN]) }
    expect(await sameJobElsewhere(dashboard, 'u1', ON_BOARD)).toEqual({ id: 'c1', title: OWN.title, company: 'Writesonic', source: 'lever:writesonic', url: OWN.url })
    expect(dashboard.listPostingsForUser).toHaveBeenCalledWith('u1', { q: 'writesonic', limit: 500 })
  })

  it('finds nothing without the same employer and title, or for a name too short to trust', async () => {
    const dashboard = { listPostingsForUser: vi.fn(async () => [OTHER_TITLE, OTHER_BOARD]) }
    expect(await sameJobElsewhere(dashboard, 'u1', ON_BOARD)).toBeNull()
    expect(await sameJobElsewhere(dashboard, 'u1', { ...ON_BOARD, company: 'EY' })).toBeNull()
  })
})

const apps = []
const dirs = []
afterEach(async () => {
  for (const app of apps.splice(0)) await app.close()
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

async function makeApp({ resume = null } = {}) {
  const dashboard = {
    getPosting: vi.fn(async (_u, id) => ({ b1: ON_BOARD })[id] ?? null),
    listPostingsForUser: vi.fn(async () => [OWN]),
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

describe('the routes a board posting uses', () => {
  it('answers the same job from the company, or null', async () => {
    const app = await makeApp()
    expect((await app.inject({ url: '/api/apply/elsewhere/b1' })).json()).toEqual({ posting: expect.objectContaining({ id: 'c1' }) })
    expect((await app.inject({ url: '/api/apply/elsewhere/nope' })).json()).toEqual({ posting: null })
  })

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
