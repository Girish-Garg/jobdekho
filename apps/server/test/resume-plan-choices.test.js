import { describe, it, expect } from 'vitest'
import { finalBullets, leftOutSkills } from '@jobdekho/server/resume/plan-choices.js'
import { applyPlanBullets } from '@jobdekho/server/resume/apply-plan.js'
import { tailoredSections } from '@jobdekho/server/resume/tailored-sections.js'
import { renderPlan } from '@jobdekho/server/resume/render-plan.js'
import { readChoices } from '@jobdekho/server/actions/resume-tailor-choices.js'
import { buildResumeTailorRefinePrompt } from '@jobdekho/server/actions/resume-tailor-refine-prompt.js'
import { PROFILE } from './fixtures/tailored-resume.js'

const ZENSAR = PROFILE.experience[1]
const ENTRY = { id: 'exp-zensar', bullets: ['Designed REST APIs.', 'Kept as is.'], was: [[ZENSAR.bullets[0]], []], dropped: [ZENSAR.bullets[1]] }
const PLAN = {
  sections: { experience: [ENTRY], projects: [{ id: 'proj-campus', bullets: ['A student marketplace.'], was: [[]], dropped: [] }] },
  leftOut: { skills: ['Kotlin', 'Firebase', 'jQuery'], projects: [], fill: [{ id: 'proj-expense', title: 'Expense Tracker' }] },
  keywords: { used: ['express'], missing: [] },
}
const chose = (choices) => ({ ...PLAN, choices })
const SLASH = String.fromCharCode(92)

describe('finalBullets', () => {
  it('prints the rewordings until the person says otherwise', () => {
    expect(finalBullets(ENTRY)).toEqual(['Designed REST APIs.', 'Kept as is.'])
  })

  it('prints the person\'s own text for a rewording they took back, and a dropped bullet they put back', () => {
    const choices = { mine: { 'exp-zensar': [0] }, back: { 'exp-zensar': [0] } }
    expect(finalBullets(ENTRY, choices)).toEqual([ZENSAR.bullets[0], 'Kept as is.', ZENSAR.bullets[1]])
  })

  it('leaves a rewording with nothing beside it as it is, and says a shared source once', () => {
    expect(finalBullets(ENTRY, { mine: { 'exp-zensar': [1] } })).toEqual(['Designed REST APIs.', 'Kept as is.'])
    const twice = { id: 'e', bullets: ['A.', 'B.'], was: [['Same.'], ['Same.']], dropped: [] }
    expect(finalBullets(twice, { mine: { e: [0, 1] } })).toEqual(['Same.'])
  })

  it('finds no choices for an entry named like an object property', () => {
    expect(finalBullets({ id: 'constructor', bullets: ['A.'], was: [['Mine.']], dropped: ['D.'] }, { mine: {}, back: {} })).toEqual(['A.'])
  })
})

describe('a plan made into a resume', () => {
  it('drops a left-out skill from the Skills rows and from every Stack line', () => {
    expect([...leftOutSkills(PLAN)]).toEqual(['kotlin', 'firebase', 'jquery'])
    const made = applyPlanBullets(PROFILE, PLAN)
    expect(made.skillGroups[0].items).toEqual(['JavaScript', 'TypeScript', 'Python', 'SQL'])
    expect(made.skillGroups[2].items).not.toContain('Firebase')
    expect(made.experience[1].tech).toEqual(['Express', 'ReactJS'])
    expect(made.projects[1].tech).toEqual([])
    expect(made.experience[1].bullets).toEqual(['Designed REST APIs.', 'Kept as is.'])
    // The stored profile is untouched.
    expect(PROFILE.skillGroups[0].items).toContain('Kotlin')
  })

  it('brings back what the person put back', () => {
    const made = applyPlanBullets(PROFILE, chose({ skills: ['Kotlin'], mine: { 'exp-zensar': [0] } }))
    expect(made.skillGroups[0].items).toContain('Kotlin')
    expect(made.projects[1].tech).toEqual(['Kotlin'])
    expect(made.experience[1].bullets[0]).toBe(ZENSAR.bullets[0])
  })

  it('renders it: no Kotlin row entry, no Stack line for the project that had only left-out tech', () => {
    const tex = renderPlan('classic', PROFILE, PLAN)
    expect(tex).toContain(`${SLASH}resSkillRow{Languages}{JavaScript, TypeScript, Python, SQL}`)
    expect(tex).not.toContain('Kotlin, Firebase')
    expect(tex).toContain('Stack: Express, ReactJS')
    expect(renderPlan('classic', PROFILE, chose({ skills: ['Kotlin', 'Firebase'] }))).toContain('Stack: Kotlin, Firebase')
  })

  it('lets the person flip a project the plan did not pick, either way', () => {
    const five = { ...PROFILE, projects: ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, title: id, bullets: ['x'], tech: [] })) }
    const picked = { sections: { projects: [{ id: 'd' }, { id: 'b' }] } }
    expect(tailoredSections(five, picked).projects).toEqual(['d', 'b', 'a'])
    expect(tailoredSections(five, { ...picked, choices: { projects: ['a', 'e'] } }).projects).toEqual(['d', 'b', 'e'])
    expect(tailoredSections(five, { ...picked, choices: { projects: ['d', 'ghost'] } }).projects).toEqual(['d', 'b', 'a'])
  })
})

describe('readChoices', () => {
  it('keeps only what the plan can vouch for', () => {
    const choices = readChoices({
      skills: ['kotlin', 'Rust', 7], projects: ['proj-expense', 'proj-campus', 'ghost'],
      mine: { 'exp-zensar': [0, 1, 0, 9, -1, 'x'], ghost: [0], constructor: [0] },
      back: { 'exp-zensar': [0, 4], 'proj-campus': [0] },
    }, PLAN)
    expect(choices).toEqual({
      skills: ['Kotlin'], projects: ['proj-expense'], mine: { 'exp-zensar': [0] }, back: { 'exp-zensar': [0] },
    })
  })

  it('is empty for nothing, or for something that is not choices at all', () => {
    const none = { skills: [], projects: [], mine: {}, back: {} }
    expect(readChoices(undefined, PLAN)).toEqual(none)
    expect(readChoices({ skills: 'Kotlin', mine: [], back: 'x' }, PLAN)).toEqual(none)
    expect(readChoices({ mine: { 'exp-zensar': [0] } }, { sections: { experience: [{ id: 'exp-zensar', bullets: ['A.'] }] } })).toEqual(none)
  })
})

describe('a refine after the person changed the plan', () => {
  const previous = (prompt) => JSON.parse(prompt.slice(prompt.indexOf('<<<PREVIOUS') + 12, prompt.indexOf('PREVIOUS>>>')))
  const POSTING = { id: 'p1', title: 'Backend Engineer', company: 'Acme' }

  it('shows the model its plan back in the shape it replied in, bullets numbered as the record has them', () => {
    const plan = previous(buildResumeTailorRefinePrompt(POSTING, PROFILE, PLAN, 'shorter'))
    expect(plan.sections.experience[0]).toEqual({
      id: 'exp-zensar', bullets: [{ from: [1], text: 'Designed REST APIs.' }, { from: [], text: 'Kept as is.' }], dropped: [2],
    })
    expect(plan.leftOut).toEqual({ skills: ['Kotlin', 'Firebase', 'jQuery'] })
    expect(JSON.stringify(plan)).not.toContain('choices')
  })

  it('shows it as the person left it, so a refine does not undo what they chose', () => {
    const left = chose({ skills: ['jQuery'], mine: { 'exp-zensar': [0] }, back: { 'exp-zensar': [0] } })
    const plan = previous(buildResumeTailorRefinePrompt(POSTING, PROFILE, left, 'shorter'))
    expect(plan.sections.experience[0].bullets).toEqual([
      { from: [1], text: ZENSAR.bullets[0] }, { from: [], text: 'Kept as is.' }, { from: [2], text: ZENSAR.bullets[1] },
    ])
    expect(plan.sections.experience[0].dropped).toEqual([])
    expect(plan.leftOut.skills).toEqual(['Kotlin', 'Firebase'])
  })
})
