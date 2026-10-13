import { describe, it, expect } from 'vitest'
import { buildResumeTailorPrompt } from '@jobdekho/server/actions/resume-tailor-prompt.js'
import { parseResumeTailor } from '@jobdekho/server/actions/resume-tailor-parse.js'
import { readBullets } from '@jobdekho/server/actions/resume-tailor-bullets.js'
import { readLeftOut, MIN_SKILLS } from '@jobdekho/server/actions/resume-tailor-left-out.js'
import { PROFILE, PLAN, JD } from './fixtures/tailored-resume.js'

const POSTING = { id: 'p1', title: 'Backend Engineer (Node.js)', company: 'Acme Systems', descriptionText: JD, tags: ['node.js', 'aws'] }
const ZENSAR = PROFILE.experience[1]

// The plan a model gives once bullets are numbered: the Android project not
// picked, the jQuery bullet dropped by its number, two skills left out.
const NUMBERED = {
  sections: {
    experience: [
      { id: 'exp-zensar', bullets: [{ from: [1], text: 'Designed REST APIs in Express for a leave management tool used by 1,200 employees.' }], dropped: [2] },
    ],
    projects: [{ id: 'proj-campus', bullets: [{ from: [1], text: 'Express and MongoDB backend for a student buy and sell app; 300 users in the first month.' }] }],
    education: [{ id: 'edu-sppu', bullets: [{ from: [1], text: 'CGPA 8.4' }] }],
  },
  leftOut: { skills: ['Kotlin', 'firebase', 'jQuery', 'Postgres', 'Rust'] },
  keywords: { used: ['node.js'], missing: [] },
}

describe('the tailoring prompt, with what it may leave out', () => {
  const prompt = buildResumeTailorPrompt(POSTING, PROFILE)
  const record = prompt.slice(prompt.indexOf('<<<RECORD'), prompt.indexOf('RECORD>>>'))

  it('numbers each entry\'s bullets, so a rewording can name its source', () => {
    expect(record).toContain('1. Built REST APIs in Express for an internal leave management tool with 1,200 employees.')
    expect(record).toContain('2. Migrated 15 legacy jQuery pages to ReactJS.')
    expect(prompt).toMatch(/"bullets":\[\{"from":\[1\],"text":/)
    expect(prompt).toMatch(/"dropped":\[3\]/)
  })

  it('shows the skills as the resume prints them, before the entries a long record would lose', () => {
    expect(record).toContain('SKILLS:\nLanguages: JavaScript, TypeScript, Python, Kotlin, SQL')
    expect(record.indexOf('SKILLS:')).toBeLessThan(record.indexOf('EXPERIENCE:'))
    expect(prompt).toMatch(/"leftOut":\{"skills":/)
    expect(prompt).toMatch(/When unsure, keep the skill/)
  })
})

describe('readBullets', () => {
  it('keeps the person\'s own text beside each rewording, and what no rewording names as left out', () => {
    const read = readBullets({ bullets: [{ from: [1], text: 'Designed REST APIs.' }] }, ZENSAR)
    expect(read.bullets).toEqual(['Designed REST APIs.'])
    expect(read.was).toEqual([[ZENSAR.bullets[0]]])
    expect(read.dropped).toEqual([ZENSAR.bullets[1]])
  })

  it('takes two bullets made one, and ignores a number the entry has no bullet for', () => {
    const read = readBullets({ bullets: [{ from: [2, 1, 2, 9, 0], text: 'Both.' }] }, ZENSAR)
    expect(read.was).toEqual([[ZENSAR.bullets[1], ZENSAR.bullets[0]]])
    expect(read.dropped).toEqual([])
  })

  it('pairs a plain string only when it is one of the entry\'s own bullets, word for word', () => {
    const read = readBullets({ bullets: ['migrated 15 legacy jQuery pages to ReactJS', 'Something reworded.'], dropped: [ZENSAR.bullets[0], 'Not a bullet of this entry.'] }, ZENSAR)
    expect(read.was).toEqual([[ZENSAR.bullets[1]], []])
    // Not every rewording names its source, so only what the model listed counts.
    expect(read.dropped).toEqual([ZENSAR.bullets[0]])
  })

  it('does not call a bullet dropped that a rewording came from', () => {
    const read = readBullets({ bullets: [{ from: [1], text: 'A.' }, { from: [2], text: 'B.' }], dropped: [2] }, ZENSAR)
    expect(read.dropped).toEqual([])
  })

  it('reads nothing from a reply with no bullets in it', () => {
    expect(readBullets({ bullets: [{ from: [1] }, null, 7] }, ZENSAR).bullets).toEqual([])
    expect(readBullets({}, ZENSAR)).toEqual({ bullets: [], was: [], dropped: [] })
  })
})

describe('readLeftOut', () => {
  const sections = { projects: [{ id: 'proj-campus' }] }
  const jd = `${POSTING.title}\n${JD}`

  it('keeps only skills the person has, in their spelling, and never one the posting asks for', () => {
    const { skills } = readLeftOut(NUMBERED, PROFILE, sections, jd)
    // Postgres is the posting's PostgreSQL; Rust is not theirs at all.
    expect(skills).toEqual(['Kotlin', 'Firebase', 'jQuery'])
  })

  it('leaves at least six skills printed, keeping the ones the model named last', () => {
    const few = { ...PROFILE, skillGroups: [{ name: 'Skills', items: ['Kotlin', 'Swift', 'Flutter', 'Dart', 'Unity', 'Blender', 'Figma', 'Excel'] }] }
    const all = { leftOut: { skills: ['Kotlin', 'Swift', 'Flutter', 'Dart', 'Unity'] } }
    expect(MIN_SKILLS).toBe(6)
    expect(readLeftOut(all, few, sections, jd).skills).toEqual(['Kotlin', 'Swift'])
    // A tech line is not the Skills section, so the floor does not hold it back.
    expect(readLeftOut({ leftOut: { skills: ['jQuery'] } }, { ...few, experience: PROFILE.experience }, sections, jd).skills).toEqual(['jQuery'])
  })

  it('says which projects the resume leaves out and which it carries only to fill the section', () => {
    const five = { ...PROFILE, projects: ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, title: `Project ${id}`, bullets: ['x'], tech: [] })) }
    const picked = { projects: [{ id: 'd' }, { id: 'b' }] }
    const out = readLeftOut({}, five, picked, jd)
    expect(out.fill).toEqual([{ id: 'a', title: 'Project a' }])
    expect(out.projects).toEqual([{ id: 'c', title: 'Project c' }, { id: 'e', title: 'Project e' }])
    expect(out.skills).toEqual([])
  })

  it('reads nothing from a list that is not one', () => {
    expect(readLeftOut({ leftOut: { skills: 'Kotlin' } }, PROFILE, sections, jd).skills).toEqual([])
    expect(readLeftOut({ leftOut: { skills: [7, null, 'x'.repeat(80)] } }, PROFILE, sections, jd).skills).toEqual([])
  })
})

describe('parseResumeTailor, with a numbered plan', () => {
  const at = { posting: POSTING, context: { profile: PROFILE } }
  const out = parseResumeTailor(JSON.stringify(NUMBERED), at)

  it('saves each rewording with the person\'s own bullet, and the fact check still holds', () => {
    const zensar = out.sections.experience[0]
    expect(zensar.bullets).toEqual(['Designed REST APIs in Express for a leave management tool used by 1,200 employees.'])
    expect(zensar.was).toEqual([[ZENSAR.bullets[0]]])
    expect(zensar.dropped).toEqual([ZENSAR.bullets[1]])
    expect(out.factCheck.ok).toBe(true)
  })

  it('saves what the resume leaves out: the skills, and the Android project kept only to fill', () => {
    expect(out.leftOut).toEqual({
      skills: ['Kotlin', 'Firebase', 'jQuery'], projects: [], fill: [{ id: 'proj-expense', title: 'Expense Tracker' }],
    })
  })

  it('still reads a plan in the shape plans had before, with nothing left out', () => {
    const old = parseResumeTailor(JSON.stringify(PLAN), at)
    expect(old.leftOut.skills).toEqual([])
    expect(old.sections.experience[1].dropped).toEqual([ZENSAR.bullets[1]])
    // "Mentored 2 interns..." was kept word for word, so it is paired.
    expect(old.sections.experience[0].was[4]).toEqual([PROFILE.experience[0].bullets[4]])
    expect(old.sections.experience[0].was[0]).toEqual([])
  })
})
