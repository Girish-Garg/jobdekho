import { describe, it, expect } from 'vitest'
import { finalBullets, leftOutSkills } from '@jobdekho/server/resume/plan-choices.js'
import { applyPlanBullets } from '@jobdekho/server/resume/apply-plan.js'
import { planEntries, tailoredSections } from '@jobdekho/server/resume/tailored-sections.js'
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

  it('leaves out a rewording the person cut, whatever else was chosen for it', () => {
    expect(finalBullets(ENTRY, { cut: { 'exp-zensar': [0] } })).toEqual(['Kept as is.'])
    expect(finalBullets(ENTRY, { cut: { 'exp-zensar': [0, 1] }, mine: { 'exp-zensar': [0] }, back: { 'exp-zensar': [0] } })).toEqual([ZENSAR.bullets[1]])
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

  it('takes out a skill the person took out themselves, as well as the ones the plan left out', () => {
    const made = applyPlanBullets(PROFILE, chose({ skillsOut: ['Python', 'redis'] }))
    expect(made.skillGroups[0].items).toEqual(['JavaScript', 'TypeScript', 'SQL'])
    expect(made.experience[0].tech).not.toContain('Redis')
    expect([...leftOutSkills(chose({ skills: ['Kotlin'], skillsOut: ['Python'] }))]).toEqual(['firebase', 'jquery', 'python'])
  })

  it('prints in the compact layout once the person picks it, and in the one asked for until then', () => {
    expect(renderPlan('classic', PROFILE, PLAN)).not.toBe(renderPlan('classic', PROFILE, chose({ compact: true })))
    expect(renderPlan('classic', PROFILE, chose({ compact: true }))).toBe(renderPlan('compact', PROFILE, PLAN))
  })

  it('lets the person flip any entry from what the plan did with it', () => {
    const five = { ...PROFILE, projects: ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, title: id, bullets: ['x'], tech: [] })) }
    const picked = { sections: { projects: [{ id: 'd' }, { id: 'b' }] } }
    expect(planEntries(five, picked, 'projects')).toEqual({ shown: ['d', 'b', 'a'], hidden: ['c', 'e'] })
    expect(tailoredSections(five, picked).projects).toEqual(['d', 'b', 'a'])
    // A top-up left out and a left-out one put back; a picked one left out.
    expect(tailoredSections(five, { ...picked, choices: { flipped: ['a', 'e'] } }).projects).toEqual(['d', 'b', 'e'])
    expect(tailoredSections(five, { ...picked, choices: { flipped: ['d', 'ghost'] } }).projects).toEqual(['b', 'a'])
    expect(tailoredSections(five, { ...picked, choices: { flipped: ['ach-sih'] } }).achievements).toEqual([])
    expect(tailoredSections(five, picked).achievements).toEqual(['ach-sih'])
  })
})

describe('readChoices', () => {
  const NONE = { skills: [], skillsOut: [], flipped: [], mine: {}, back: {}, cut: {}, compact: false }

  it('keeps only what the plan and the record can vouch for', () => {
    const choices = readChoices({
      skills: ['kotlin', 'Rust', 7], skillsOut: ['python', 'Kotlin', 'Rust', 'redis'],
      flipped: ['proj-expense', 'ach-sih', 'ghost', 'ach-sih', 7],
      mine: { 'exp-zensar': [0, 1, 0, 9, -1, 'x'], ghost: [0], constructor: [0] },
      back: { 'exp-zensar': [0, 4], 'proj-campus': [0] },
      cut: { 'exp-zensar': [1, 5], ghost: [0] },
      compact: true,
    }, PLAN, PROFILE)
    expect(choices).toEqual({
      // Kotlin is the plan's to put back, not to take out twice.
      skills: ['Kotlin'], skillsOut: ['Python', 'Redis'], flipped: ['proj-expense', 'ach-sih'],
      mine: { 'exp-zensar': [0] }, back: { 'exp-zensar': [0] }, cut: { 'exp-zensar': [1] }, compact: true,
    })
  })

  it('is empty for nothing, or for something that is not choices at all', () => {
    expect(readChoices(undefined, PLAN, PROFILE)).toEqual(NONE)
    expect(readChoices({ skills: 'Kotlin', flipped: 'x', mine: [], back: 'x', cut: 3, compact: 'yes' }, PLAN, PROFILE)).toEqual(NONE)
    expect(readChoices({ mine: { 'exp-zensar': [0] } }, { sections: { experience: [{ id: 'exp-zensar', bullets: ['A.'] }] } })).toEqual(NONE)
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

  it('shows a bullet and a skill the person took out as left out', () => {
    const left = chose({ cut: { 'exp-zensar': [0] }, skillsOut: ['Python'] })
    const plan = previous(buildResumeTailorRefinePrompt(POSTING, PROFILE, left, 'shorter'))
    expect(plan.sections.experience[0]).toEqual({ id: 'exp-zensar', bullets: [{ from: [], text: 'Kept as is.' }], dropped: [1, 2] })
    expect(plan.leftOut.skills).toEqual(['Kotlin', 'Firebase', 'jQuery', 'Python'])
  })
})
