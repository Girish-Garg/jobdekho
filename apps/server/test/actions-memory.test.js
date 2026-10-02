import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'
import { actionMemory, memoryNote } from '@jobdekho/server/actions/memory-note.js'
import { buildResumeTailorPrompt } from '@jobdekho/server/actions/resume-tailor-prompt.js'
import { buildResumeTailorRefinePrompt } from '@jobdekho/server/actions/resume-tailor-refine-prompt.js'
import { buildCoverLetterPrompt } from '@jobdekho/server/actions/cover-letter-prompt.js'
import { buildCoverLetterRefinePrompt } from '@jobdekho/server/actions/cover-letter-refine-prompt.js'
import { PROFILE, PLAN, JD } from './fixtures/tailored-resume.js'

const ITEMS = [
  { id: 'a1', text: 'Use Indian English', scope: 'everywhere' },
  { id: 'b2', text: 'Keep my resume to one page', scope: 'resume' },
  { id: 'c3', text: 'Keep my cover letters short', scope: 'letters' },
  { id: 'd4', text: 'Only show me remote roles', scope: 'jobs' },
]
const POSTING = { id: 'p1', title: 'Backend Engineer', company: 'Acme', location: 'Pune', descriptionText: JD, tags: [] }
const NOTE = 'This person\'s saved preferences, each written or approved by them.'

describe('the preferences an action is written with', () => {
  const dashboard = (enabled = true) => ({ getMemory: vi.fn(async () => ({ enabled, items: ITEMS, archived: 0 })) })

  it('are those for everywhere and for the action\'s own kind of document', async () => {
    expect((await actionMemory(dashboard(), 'u1', 'resume')).map((item) => item.id)).toEqual(['a1', 'b2'])
    expect((await actionMemory(dashboard(), 'u1', 'letters')).map((item) => item.id)).toEqual(['a1', 'c3'])
  })

  it('are none when memory is off, the action names no scope, or the dashboard predates memory', async () => {
    expect(await actionMemory(dashboard(false), 'u1', 'resume')).toEqual([])
    const asked = dashboard()
    expect(await actionMemory(asked, 'u1', undefined)).toEqual([])
    expect(asked.getMemory).not.toHaveBeenCalled()
    expect(await actionMemory({}, 'u1', 'resume')).toEqual([])
  })

  it('read one line each with its scope, as preferences and never as facts', () => {
    const note = memoryNote(ITEMS.slice(0, 2))
    expect(note).toContain(NOTE)
    expect(note).toContain('never take an employer, a title, a skill, a date or a number from them')
    expect(note).toContain('- [everywhere] Use Indian English\n- [resume] Keep my resume to one page\n')
    expect(memoryNote([])).toBe('')
  })
})

describe('the prompts that carry them', () => {
  const picked = [ITEMS[0], ITEMS[1]]

  it('follow the record in the resume tailoring, outside its fence, and only when there are any', () => {
    expect(buildResumeTailorPrompt(POSTING, PROFILE).endsWith('RECORD>>>\n')).toBe(true)
    const prompt = buildResumeTailorPrompt(POSTING, PROFILE, picked)
    expect(prompt.indexOf(NOTE)).toBeGreaterThan(prompt.indexOf('RECORD>>>'))
    expect(prompt).toContain('- [resume] Keep my resume to one page')
    const refine = buildResumeTailorRefinePrompt(POSTING, PROFILE, PLAN, 'lead with the Node role', picked)
    expect(refine.indexOf(NOTE)).toBeLessThan(refine.indexOf('<<<PREVIOUS'))
  })

  it('follow the resume in the cover letter, and ride along into a refine', () => {
    const context = { resumeText: 'JANE RESUME', memory: [ITEMS[0], ITEMS[2]] }
    expect(buildCoverLetterPrompt(POSTING, { resumeText: 'JANE RESUME' }).endsWith('RESUME>>>\n')).toBe(true)
    const prompt = buildCoverLetterPrompt(POSTING, context)
    expect(prompt.indexOf(NOTE)).toBeGreaterThan(prompt.indexOf('RESUME>>>'))
    expect(buildCoverLetterRefinePrompt(POSTING, context, { letter: 'Dear team' }, 'shorter')).toContain('- [letters] Keep my cover letters short')
  })
})

describe('the posting AI route', () => {
  const store = () => ({
    listPostingsForUser: vi.fn().mockResolvedValue([]), getPosting: vi.fn(async () => POSTING), setPostingStatus: vi.fn(),
    listSources: vi.fn().mockResolvedValue([]), getProfile: vi.fn().mockResolvedValue(PROFILE), getResumeText: vi.fn().mockResolvedValue('JANE RESUME'),
    upsertProfile: vi.fn(), deleteProfile: vi.fn(), getUserFilters: vi.fn().mockResolvedValue(null), upsertUserFilters: vi.fn(),
    getAiResult: vi.fn().mockResolvedValue(null), setAiResult: vi.fn(async (_u, record) => record), listAiResults: vi.fn().mockResolvedValue([]),
    getMemory: vi.fn(async () => ({ enabled: true, items: ITEMS, archived: 0 })),
  })
  const REPLIES = {
    'cover-letter': { letter: 'Dear Hiring Team at Acme', usedFromResume: [], notClaimed: [] },
    'resume-tailor': PLAN,
    'fake-check': { verdict: 'genuine', summary: 'Looks real.', checks: [], redFlags: [] },
  }

  async function prompted(kind) {
    const run = vi.fn(async () => ({ stdout: JSON.stringify({ type: 'result', result: JSON.stringify(REPLIES[kind]) }), stderr: '', code: 0 }))
    const app = buildApp({ config: { sessionSecret: 'test-secret' }, dashboardStore: store() })
    app.decorate('cli', { locate: () => '/usr/local/bin/claude', run, scratch: (work) => work('/scratch') })
    await app.ready()
    const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
    const res = await app.inject({ method: 'POST', url: `/api/postings/p1/ai/${kind}`, headers: { cookie } })
    expect(res.statusCode).toBe(200)
    return run.mock.calls.at(-1)[0].input
  }

  it('writes a cover letter with the letters and everywhere preferences only', async () => {
    const input = await prompted('cover-letter')
    expect(input).toContain('- [letters] Keep my cover letters short')
    expect(input).toContain('- [everywhere] Use Indian English')
    expect(input).not.toContain('Keep my resume to one page')
    expect(input).not.toContain('Only show me remote roles')
  })

  it('tailors a resume with the resume and everywhere preferences only', async () => {
    const input = await prompted('resume-tailor')
    expect(input).toContain('- [resume] Keep my resume to one page')
    expect(input).toContain('- [everywhere] Use Indian English')
    expect(input).not.toContain('Keep my cover letters short')
  })

  it('gives the fake check, which searches the web, none at all', async () => {
    const input = await prompted('fake-check')
    expect(input).not.toContain('Use Indian English')
    expect(input).not.toContain('saved preferences')
  })
})
