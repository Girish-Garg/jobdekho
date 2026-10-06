import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from '@jobdekho/server/app.js'
import { openStore } from '@jobdekho/store/open.js'
import { TAGS_VERSION } from '@jobdekho/core/tag.js'
import { getPosting } from '@jobdekho/store/posting-lookup.js'
import { describeAndSave } from '../src/api/describe-posting.js'
import { createDashboardStore } from '../src/api/store.js'

// Every describer here is a fake: no board is ever reached.
const config = { sessionSecret: 'test-secret' }

async function signedCookie(app) {
  await app.ready()
  return `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
}

describe('POST /api/postings/:id/describe', () => {
  const POSTING = { id: 'li1', title: 'Back End Developer', descriptionText: 'Build APIs.' }
  const makeApp = (result) => {
    const dashboardStore = { describePosting: vi.fn(async () => result) }
    return { app: buildApp({ config, dashboardStore }), dashboardStore }
  }

  it('returns 401 without a session', async () => {
    const { app } = makeApp({ posting: POSTING, described: true }); await app.ready()
    expect((await app.inject({ method: 'POST', url: '/api/postings/li1/describe' })).statusCode).toBe(401)
  })

  it('returns the posting with its new text', async () => {
    const { app, dashboardStore } = makeApp({ posting: POSTING, described: true })
    const res = await app.inject({ method: 'POST', url: '/api/postings/li1/describe', headers: { cookie: await signedCookie(app) } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ posting: POSTING, described: true })
    expect(dashboardStore.describePosting).toHaveBeenCalledWith('u1', 'li1')
  })

  // LinkedIn switched off in Settings is refused with a sentence saying so.
  it('passes a refusal through with its status and sentence', async () => {
    const { app } = makeApp({ status: 403, error: 'LinkedIn is switched off in Settings.' })
    const res = await app.inject({ method: 'POST', url: '/api/postings/li1/describe', headers: { cookie: await signedCookie(app) } })
    expect(res.statusCode).toBe(403)
    expect(res.json()).toEqual({ error: 'LinkedIn is switched off in Settings.' })
  })
})

describe('describeAndSave', () => {
  let dir
  let db
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'jobdekho-describe-route-'))
    db = openStore(dir)
  })
  afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

  const card = {
    id: 'sr1', source: 'smartrecruiters:BoschGroup', externalId: '7440001', title: 'HW Developer', company: 'Bosch',
    location: 'Bengaluru', url: 'u', descriptionSnippet: '', descriptionText: '', tags: [], level: null, type: 'job',
    tagsVersion: TAGS_VERSION, board: { type: null, employment: null, workMode: null },
  }
  const seed = (rows) => db.corpus.save(new Map(rows.map((r) => [r.id, r])))
  const getPostingFor = (id) => getPosting(db, 'local', id)

  it('stores the fetched text, tags the posting again and returns it whole', async () => {
    seed([card])
    const describe = vi.fn(async () => ({ page: { description: 'Requirements:\n- 3-5 years of embedded C\nWorkplace type: Hybrid' } }))
    const out = await describeAndSave(db, describe, 'local', 'sr1')
    expect(out.described).toBe(true)
    expect(out.posting).toMatchObject({ level: 'mid', workMode: 'hybrid', facts: { years: { min: 3, max: 5 } } })
    expect(out.posting.sections[0]).toMatchObject({ kind: 'requirements', heading: 'Requirements' })
    expect(db.corpus.byId().get('sr1').descriptionText).toContain('embedded C')
  })

  // An Internshala card stores only its first line, which is not its text.
  it('reads the page of a posting that holds only a board teaser', async () => {
    const teaser = 'As a React Native Development intern at Krazio Cloud, you will have the exciting opportunity t'
    seed([{ ...card, id: 'is1', source: 'internshala', externalId: '9', descriptionText: teaser, descriptionSnippet: teaser }])
    expect((await getPostingFor('is1')).descriptionPartial).toBe(true)
    const describe = vi.fn(async () => ({ page: { description: 'About the internship\n\nBuild mobile apps with React Native.' } }))
    const out = await describeAndSave(db, describe, 'local', 'is1')
    expect(out.described).toBe(true)
    expect(out.posting).toMatchObject({ descriptionText: expect.stringContaining('React Native'), descriptionPartial: false })
  })

  // A posting that already has its text costs no request.
  it('returns a posting that has its text without asking the board', async () => {
    seed([{ ...card, descriptionText: 'Kept text.' }])
    const describe = vi.fn()
    const out = await describeAndSave(db, describe, 'local', 'sr1')
    expect(out).toMatchObject({ described: false, posting: { descriptionText: 'Kept text.' } })
    expect(describe).not.toHaveBeenCalled()
  })

  it('passes a refusal through and stores nothing', async () => {
    seed([card])
    const out = await describeAndSave(db, async () => ({ status: 403, error: 'off' }), 'local', 'sr1')
    expect(out).toEqual({ status: 403, error: 'off' })
    expect(db.corpus.byId().get('sr1').descriptionText).toBe('')
  })

  it('is a 404 for a posting the corpus does not hold', async () => {
    expect(await describeAndSave(db, vi.fn(), 'local', 'gone')).toEqual({ status: 404, error: 'no such posting' })
  })

  // The real store wires the scraper's describer in, made only when needed.
  it('is what the dashboard store runs, with the describer it is given', async () => {
    seed([card])
    const describe = vi.fn(async () => ({ page: { description: 'Build boards.' } }))
    const out = await createDashboardStore(db, { describe }).describePosting('local', 'sr1')
    expect(out.posting.descriptionText).toBe('Build boards.')
  })
})
