import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'
import { memoryChatStore } from './fixtures/chat-store.js'
import { parseResumeTailor } from '@jobdekho/server/actions/resume-tailor-parse.js'
import { LatexError } from '@jobdekho/server/resume/errors.js'
import { PROFILE, JD } from './fixtures/tailored-resume.js'

const config = { sessionSecret: 'test-secret' }
const POSTING = { id: 'p1', title: 'Backend Engineer (Node.js)', company: 'Acme Systems', descriptionText: JD, tags: ['node.js'] }

const PLAN = parseResumeTailor(JSON.stringify({
  sections: {
    experience: [{ id: 'exp-zensar', bullets: [{ from: [1], text: 'Designed REST APIs in Express for 1,200 employees.' }] }],
    projects: [{ id: 'proj-campus', bullets: [{ from: [1], text: 'A buy and sell app built with Express and MongoDB. 300 users in the first month.' }] }],
  },
  leftOut: { skills: ['Kotlin'] },
  keywords: { used: ['express'], missing: [] },
}), { posting: POSTING, context: { profile: PROFILE } })
const SAVED = { kind: 'resume-tailor', postingId: 'p1', provider: 'claude', createdAt: '2026-10-13T00:00:00.000Z', result: PLAN }
const NONE = { skills: [], skillsOut: [], flipped: [], mine: {}, back: {}, cut: {}, compact: false }

// One line per bullet the page prints, and a second page past eight of them.
const bullets = (pdf) => pdf.toString().split('\n').filter((line) => line.includes('\\item')).length

async function makeApp({ saved = SAVED, compile, posting = POSTING } = {}) {
  let record = saved
  const store = {
    getAiResult: vi.fn(async () => record),
    replaceAiResult: vi.fn(async (_userId, { result }) => { record = { ...record, result }; return record }),
    getProfile: vi.fn().mockResolvedValue(PROFILE),
    getPosting: vi.fn().mockResolvedValue(posting),
  }
  const app = buildApp({ config, dashboardStore: store })
  app.decorate('chatStore', memoryChatStore())
  app.decorate('resumeCompile', compile ?? vi.fn(async (tex) => ({ pdf: Buffer.from(tex) })))
  app.decorate('pdfPages', vi.fn(async (pdf) => ({ pages: bullets(pdf) > 8 ? 2 : 1, lastLines: bullets(pdf) - 8, lines: bullets(pdf) })))
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
  const call = (method, path, body) => app.inject({
    method, url: `/api/postings/p1/ai/resume-tailor/${path}`, payload: body ? JSON.stringify(body) : undefined,
    headers: body ? { cookie, 'content-type': 'application/json' } : { cookie },
  })
  return { app, store, call }
}

describe('the review of a tailoring', () => {
  it('lays the plan out for the screen, with the choices saved so far and nothing of the AI asked', async () => {
    const { call } = await makeApp({ saved: { ...SAVED, result: { ...PLAN, choices: { skills: ['Kotlin'], compact: true } } } })
    const res = await call('GET', 'review')
    expect(res.statusCode).toBe(200)
    const view = res.json()
    expect(view.posting).toEqual({ id: 'p1', title: 'Backend Engineer (Node.js)', company: 'Acme Systems' })
    expect(view.choices).toEqual({ ...NONE, skills: ['Kotlin'], compact: true })
    expect(view.skills.find((skill) => skill.name === 'Kotlin')).toEqual({ name: 'Kotlin', leftOut: true, asked: false })
    expect(view.sections.map((section) => section.key)).toEqual(['experience', 'projects', 'education', 'achievements'])
    expect(view.factCheck).toEqual(PLAN.factCheck)
    expect(view.createdAt).toBe(SAVED.createdAt)
  })

  it('still opens for a job the feed has since dropped, without its name', async () => {
    const { call } = await makeApp({ posting: null })
    expect((await call('GET', 'review')).json().posting).toEqual({ id: 'p1', title: '', company: '' })
  })

  it('is a 404 with words to show when no plan was made for this job, whichever route is asked', async () => {
    const { call, store } = await makeApp({ saved: null })
    for (const [method, path] of [['GET', 'review'], ['GET', 'fit'], ['POST', 'preview'], ['PUT', 'choices']]) {
      const res = await call(method, path, method === 'PUT' ? { skills: ['Kotlin'] } : undefined)
      expect(res.statusCode).toBe(404)
      expect(res.json()).toEqual({ error: 'Tailor your resume for this job first.' })
    }
    expect(store.replaceAiResult).not.toHaveBeenCalled()
  })
})

describe('PUT choices', () => {
  it('saves what the person chose on the newest plan, in place, and answers with the record', async () => {
    const { call, store } = await makeApp()
    const res = await call('PUT', 'choices', { skills: ['kotlin'], skillsOut: ['Python'], flipped: ['proj-expense'], cut: { 'exp-zensar': [0] }, compact: true })
    expect(res.statusCode).toBe(200)
    const choices = { ...NONE, skills: ['Kotlin'], skillsOut: ['Python'], flipped: ['proj-expense'], cut: { 'exp-zensar': [0] }, compact: true }
    expect(store.replaceAiResult).toHaveBeenCalledWith('u1', { postingId: 'p1', kind: 'resume-tailor', result: { ...PLAN, choices } })
    expect(res.json().result.choices).toEqual(choices)
    expect(res.json().createdAt).toBe(SAVED.createdAt)
  })

  it('keeps nothing the plan and the record cannot vouch for', async () => {
    const { call } = await makeApp()
    const res = await call('PUT', 'choices', { skills: ['Rust'], skillsOut: ['Rust'], flipped: ['ghost'], mine: { 'exp-zensar': [4], constructor: [0] }, back: { nope: [0] } })
    expect(res.json().result.choices).toEqual(NONE)
  })
})

describe('POST preview', () => {
  it('compiles the page the plan makes as the person left it, and says how long it runs', async () => {
    const { app, call } = await makeApp()
    const res = await call('POST', 'preview')
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('application/pdf')
    expect(res.headers['x-pdf-pages']).toBe('2')
    expect(res.headers['x-pdf-last-lines']).toBe('2')
    expect(res.body).toContain('Designed REST APIs in Express')
    expect(res.body).toContain('{Languages}{JavaScript, TypeScript, Python, SQL}')
    await call('POST', 'preview')
    expect(app.resumeCompile).toHaveBeenCalledTimes(1)
    await call('PUT', 'choices', { skills: ['Kotlin'] })
    expect((await call('POST', 'preview')).body).toContain('{Languages}{JavaScript, TypeScript, Python, Kotlin, SQL}')
    expect(app.resumeCompile).toHaveBeenCalledTimes(2)
  })

  it('says why there is no page when LaTeX cannot build one', async () => {
    const compile = vi.fn(async () => { throw new LatexError('not_found') })
    const { call } = await makeApp({ compile })
    const res = await call('POST', 'preview')
    expect(res.statusCode).toBe(503)
    expect(res.json().kind).toBe('not_found')
    expect((await call('GET', 'fit')).statusCode).toBe(503)
  })
})

describe('GET fit', () => {
  it('lists what could go with the lines each saves, content before layout, and whether it is enough', async () => {
    const { call } = await makeApp()
    const fit = (await call('GET', 'fit')).json()
    expect(fit.cuts.map((cut) => cut.key)).toEqual(['entry:proj-expense', 'section:achievements', 'compact'])
    expect(fit.cuts[0]).toEqual({ key: 'entry:proj-expense', label: 'Project: Expense Tracker', why: 'Not picked for this job', patch: { flipped: ['proj-expense'] }, saves: 1 })
    expect(fit.cuts[1].saves).toBe(1)
    expect(fit.enough).toBe(true)
  })
})
