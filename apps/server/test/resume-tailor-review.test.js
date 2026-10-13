import { describe, it, expect, vi } from 'vitest'
import { reviewBase } from '@jobdekho/server/actions/resume-tailor-view.js'
import { fitCuts } from '@jobdekho/server/actions/resume-tailor-fit.js'
import { patched, patchedAll } from '@jobdekho/server/resume/plan-patch.js'
import { createPlanPreviews } from '@jobdekho/server/resume/plan-preview.js'
import { parseResumeTailor } from '@jobdekho/server/actions/resume-tailor-parse.js'
import { PROFILE, JD } from './fixtures/tailored-resume.js'

const POSTING = { id: 'p1', title: 'Backend Engineer (Node.js)', company: 'Acme Systems', descriptionText: JD, tags: ['node.js', 'aws'] }
const INFOBEANS = PROFILE.experience[0]

// A plan as the server saves it: the Android project not picked, one skill
// left out, a bullet reworded and one kept word for word.
const PLAN = parseResumeTailor(JSON.stringify({
  sections: {
    experience: [
      { id: 'exp-infobeans', bullets: [
        { from: [2], text: 'Cut API response time by 35% with Redis caching and PostgreSQL query indexes.' },
        { from: [5], text: 'Mentored 2 interns on code review and Git workflow.' },
        { from: [3], text: 'Wrote unit tests with Jest, raising coverage from 48% to 81%.' },
      ] },
      { id: 'exp-zensar', bullets: [{ from: [1], text: 'Designed REST APIs in Express for a leave management tool used by 1,200 employees.' }] },
    ],
    projects: [{ id: 'proj-campus', bullets: [{ from: [1], text: 'Express and MongoDB backend for a student buy and sell app; 300 users in the first month.' }] }],
    education: [{ id: 'edu-sppu', bullets: [{ from: [1], text: 'CGPA 8.4' }] }],
  },
  leftOut: { skills: ['Kotlin', 'jQuery'] },
  keywords: { used: ['node.js', 'redis'], missing: ['kafka'] },
}), { posting: POSTING, context: { profile: PROFILE } })

describe('reviewBase', () => {
  const base = reviewBase(PROFILE, PLAN, POSTING)
  const entry = (id) => base.sections.flatMap((section) => section.entries).find((one) => one.id === id)

  it('lists every skill the resume could print, what the plan left out and what the posting asks for', () => {
    const skill = (name) => base.skills.find((one) => one.name === name)
    expect(skill('Kotlin')).toEqual({ name: 'Kotlin', leftOut: true, asked: false })
    expect(skill('Redis')).toEqual({ name: 'Redis', leftOut: false, asked: true })
    expect(skill('Postgres')).toMatchObject({ leftOut: false, asked: true })
    // Only ever in an entry's Stack line, so it is listed after the Skills rows.
    expect(base.skills.at(-1)).toEqual({ name: 'jQuery', leftOut: true, asked: false })
    expect(base.skills).toHaveLength(18)
  })

  it('lays a picked entry out bullet by bullet, with the original only where it was reworded', () => {
    const infobeans = entry('exp-infobeans')
    expect(infobeans.state).toBe('picked')
    expect(infobeans.bullets[0]).toEqual({ now: 'Cut API response time by 35% with Redis caching and PostgreSQL query indexes.', yours: INFOBEANS.bullets[1] })
    expect(infobeans.bullets[1]).toEqual({ now: INFOBEANS.bullets[4], yours: '' })
    expect(infobeans.dropped).toEqual([INFOBEANS.bullets[0], INFOBEANS.bullets[3]])
    expect(infobeans.own).toBeNull()
  })

  it('says how each unpicked entry got where it is, with its bullets as written', () => {
    expect(entry('proj-expense')).toMatchObject({ state: 'fill', bullets: null, own: ['Android app in Kotlin with a Firebase backend.'] })
    expect(entry('ach-sih')).toMatchObject({ state: 'kept', bullets: null })
    expect(base.sections.map((section) => section.title)).toEqual(['Experience', 'Projects', 'Education', 'Achievements'])
    const five = { ...PROFILE, projects: ['a', 'b', 'c', 'd'].map((id) => ({ id, title: id, bullets: ['x'], tech: [] })) }
    const out = reviewBase(five, { ...PLAN, sections: { ...PLAN.sections, projects: [] } }, POSTING)
    expect(out.sections[1].entries.map((one) => `${one.id}:${one.state}`)).toEqual(['a:fill', 'b:fill', 'c:fill', 'd:out'])
  })
})

describe('fitCuts', () => {
  const cuts = fitCuts(PROFILE, PLAN, POSTING)

  it('offers content before layout: unpicked projects, small sections, idle bullets, then the compact layout last', () => {
    expect(cuts.map((cut) => cut.key)).toEqual(['entry:proj-expense', 'section:achievements', 'bullet:exp-infobeans:2', 'bullet:exp-infobeans:1', 'compact'])
    expect(cuts[0]).toEqual({ key: 'entry:proj-expense', label: 'Project: Expense Tracker', why: 'Not picked for this job', patch: { flipped: ['proj-expense'] } })
    expect(cuts[1]).toMatchObject({ label: 'Section: Achievements', why: 'One entry', patch: { flipped: ['ach-sih'] } })
    expect(cuts.at(-1)).toEqual({ key: 'compact', label: 'Compact layout', why: 'Tighter spacing, nothing removed', patch: { compact: true } })
  })

  // Mentoring and Jest are nothing the posting asks for; Redis and PostgreSQL are.
  it('offers a bullet only when it names nothing the posting asks for, and never an entry down to none', () => {
    expect(cuts[2].label).toBe('Bullet: Wrote unit tests with Jest, raising coverage from 48% to 81%.')
    expect(cuts[3]).toEqual({
      key: 'bullet:exp-infobeans:1', label: 'Bullet: Mentored 2 interns on code review and Git workflow.',
      why: 'In Software Developer, names nothing this job asks for', patch: { cut: { 'exp-infobeans': [1] } },
    })
    expect(cuts.some((cut) => cut.key.startsWith('bullet:exp-zensar'))).toBe(false)
    expect(fitCuts(PROFILE, PLAN, { title: 'Clerk', descriptionText: 'Filing.' }).some((cut) => cut.key.startsWith('bullet:'))).toBe(false)
  })

  it('offers the last project picked once more than one was', () => {
    const two = { ...PLAN, sections: { ...PLAN.sections, projects: [...PLAN.sections.projects, { id: 'proj-expense', title: 'Expense Tracker', bullets: ['x'] }] }, leftOut: { ...PLAN.leftOut, fill: [] } }
    expect(fitCuts(PROFILE, two, POSTING).map((cut) => cut.key)).toContain('entry:proj-expense')
    expect(fitCuts(PROFILE, two, POSTING).find((cut) => cut.key === 'entry:proj-expense').why).toBe('The least related project picked')
  })
})

describe('a cut as a change to the choices', () => {
  it('makes a cut and takes it back, leaving every other choice alone', () => {
    const start = { skills: ['Kotlin'], flipped: ['x'], cut: { e1: [2] }, compact: false }
    const made = patched(start, { flipped: ['y'], cut: { e1: [0], e2: [1] } }, true)
    expect(made).toEqual({ skills: ['Kotlin'], flipped: ['x', 'y'], cut: { e1: [0, 2], e2: [1] }, compact: false })
    expect(patched(made, { flipped: ['y'], cut: { e1: [0], e2: [1] } }, false)).toEqual({ ...start, cut: { e1: [2], e2: [] } })
    expect(patched(start, { compact: true }, true).compact).toBe(true)
    expect(patched({ compact: true }, { flipped: ['y'] }, true).compact).toBe(true)
    expect(patchedAll({}, [{ flipped: ['a'] }, { compact: true }])).toEqual({ flipped: ['a'], cut: {}, compact: true })
  })
})

describe('createPlanPreviews', () => {
  // One line per bullet the page prints, so a cut saves exactly what it removes.
  const lines = (pdf) => pdf.toString().split('\n').filter((line) => line.includes('\\item')).length
  const make = () => {
    const compile = vi.fn(async (tex) => ({ pdf: Buffer.from(tex) }))
    const measure = vi.fn(async (pdf) => ({ pages: lines(pdf) > 9 ? 2 : 1, lastLines: 3, lines: lines(pdf) }))
    return { compile, measure, previews: createPlanPreviews({ compile, measure }) }
  }

  it('compiles the page a plan makes once, and again only when a choice changes it', async () => {
    const { compile, previews } = make()
    const first = await previews.of(PROFILE, PLAN)
    expect(first.length).toEqual({ pages: 1, lastLines: 3, lines: 8 })
    await previews.of(PROFILE, { ...PLAN, choices: {} })
    expect(compile).toHaveBeenCalledTimes(1)
    await previews.of(PROFILE, { ...PLAN, choices: { cut: { 'exp-infobeans': [1] } } })
    expect(compile).toHaveBeenCalledTimes(2)
  })

  it('counts what each cut saves on the page, whatever is already ticked, and whether all of them are enough', async () => {
    const { previews } = make()
    const cuts = fitCuts(PROFILE, PLAN, POSTING)
    const fresh = await previews.measured(PROFILE, PLAN, cuts)
    expect(fresh.cuts.map((cut) => [cut.key, cut.saves])).toEqual([['entry:proj-expense', 1], ['section:achievements', 1], ['bullet:exp-infobeans:2', 1], ['bullet:exp-infobeans:1', 1], ['compact', 0]])
    expect(fresh.enough).toBe(true)
    const ticked = await previews.measured(PROFILE, { ...PLAN, choices: { flipped: ['proj-expense'] } }, cuts)
    expect(ticked.cuts[0].saves).toBe(1)
  })

  it('hands on a refusal to compile, and a page it cannot measure without a length', async () => {
    const failing = createPlanPreviews({ compile: async () => { throw Object.assign(new Error('The resume needs LaTeX.'), { name: 'LatexError', kind: 'not_found', status: 503 }) }, measure: vi.fn() })
    expect((await failing.of(PROFILE, PLAN)).failure).toMatchObject({ status: 503, body: { kind: 'not_found' } })
    const blind = createPlanPreviews({ compile: async (tex) => ({ pdf: Buffer.from(tex) }), measure: async () => { throw new Error('not a pdf') } })
    expect((await blind.of(PROFILE, PLAN)).length).toBeNull()
    expect((await blind.measured(PROFILE, PLAN, fitCuts(PROFILE, PLAN, POSTING))).enough).toBeNull()
  })
})
