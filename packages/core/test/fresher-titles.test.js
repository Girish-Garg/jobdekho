import { describe, it, expect } from 'vitest'
import { levelTag } from '@jobdekho/core/level.js'
import { titleSays, titleEvidence } from '@jobdekho/core/title-rules.js'
import { titleLevel } from '@jobdekho/core/title-level.js'
import { graduateProgramme } from '@jobdekho/core/graduate-programmes.js'
import { postingFeatures, withTitleLevel } from '@jobdekho/core/posting-features.js'

// The starting titles of companies known for hiring freshers in India, as
// the owner listed them on 2026-10-04. The owner's rule: a trainee or
// graduate-programme job is Entry, a full-time first job; only a fixed-term
// internship, apprenticeship or traineeship is Internship. Before the fix,
// the College Grad and EDG titles stated no level at all.
const TITLES = [
  ['Graduate Engineer Trainee', 'Mercedes-Benz'],
  ['Post Graduate Engineer Trainee', 'Mercedes-Benz'],
  ['Graduate Trainee Engineer', 'Siemens'],
  ['GET - Software', 'Mercedes-Benz'],
  ['Engineer - Trainee', 'ZF'],
  ['Software Engineer I', 'Honeywell'],
  ['Associate Software Engineer', 'Siemens'],
  ['Software Engineer (College Grad)', 'Cisco'],
  ['Software Engineer (Grade 4 / College Grad)', 'Cisco'],
  ['Engineering Development Group', 'MathWorks'],
  ['Software Engineer - EDG', 'MathWorks'],
]

const level = (title, company, description = '') => levelTag({ title, company, description })?.value ?? null

describe("the owner's fresher titles", () => {
  for (const [title, company] of TITLES) {
    it(`reads "${title}" at ${company} as entry`, () => {
      expect(level(title, company)).toBe('entry')
    })
  }

  it('reads a full-time graduate programme as entry, and a fixed-term traineeship as an internship', () => {
    const job = 'Our Graduate Engineer Trainee programme hires fresh B.E. graduates into full-time roles.'
    const stint = 'This is a 12-month traineeship. You will rotate across teams.'
    expect(level('Graduate Engineer Trainee', 'Mercedes-Benz', job)).toBe('entry')
    expect(level('Graduate Engineer Trainee', 'Mercedes-Benz', stint)).toBe('internship')
    expect(level('Software Engineer - EDG', 'MathWorks', stint)).toBe('internship')
    expect(level('Multiple Openings-Engineering Development Group Internship', 'MathWorks')).toBe('internship')
  })

  // An experienced title keeps its own word, wherever it names the programme.
  it('lets a seniority word outrank the programme', () => {
    expect(level('Senior Software Engineer - EDG', 'MathWorks')).toBe('senior')
    expect(level('Engineering Development Group Lead', 'MathWorks')).toBe('senior')
  })

  it('says which words decided', () => {
    expect(titleEvidence(titleSays('Software Engineer (College Grad)'))).toBe('Title says College Grad')
    expect(titleEvidence(titleSays('Software Engineer - EDG', 'MathWorks')))
      .toBe("Title says EDG, the company's graduate programme")
  })
})

describe('a graduate programme is read only at its company', () => {
  it("reads MathWorks' Engineering Development Group and EDG, by any spelling of its name", () => {
    expect(graduateProgramme('Software Engineer - EDG', 'MathWorks')).toMatchObject({ level: 'entry', rule: 'programme', word: 'EDG' })
    expect(graduateProgramme('Application Engineer - Engineering Development Group', 'The MathWorks, Inc.')?.level).toBe('entry')
    expect(graduateProgramme('Software Engineer - EDG', 'MATHWORKS INDIA PRIVATE LIMITED')?.level).toBe('entry')
  })

  // Elsewhere a group of that name, or the letters EDG, may be any team.
  it('leaves the same words alone at another company, or with no company', () => {
    expect(level('Software Engineer - EDG', 'Acme')).toBeNull()
    expect(level('Mechanical Engineer - Engineering Development Group', 'Acme')).toBeNull()
    expect(level('Software Engineer - EDG')).toBeNull()
    expect(graduateProgramme('Software Engineer - Edge', 'MathWorks')).toBeNull()
  })

  // A real employer, Constructor, keys to "constructor", a name every plain
  // object answers to: the lookup threw and took a whole refresh down.
  it('reads nothing at a company named like a property every object has', () => {
    for (const company of ['Constructor', 'The Constructor', 'Constructor Technology', '__proto__', 'toString', 'hasOwnProperty']) {
      expect(graduateProgramme('Software Engineer - EDG', company)).toBeNull()
      expect(level('Software Engineer - EDG', company)).toBeNull()
    }
    expect(postingFeatures({ title: 'Software Engineer', company: 'Constructor' })).toMatchObject({ titleLevel: null })
  })

  // The chip and the fit read one rule set, company included.
  it('reaches the fit as well as the chip', () => {
    expect(titleLevel('Software Engineer - EDG', 'MathWorks')).toEqual({ level: 'entry', band: [0, 2] })
    expect(titleLevel('Software Engineer - EDG', 'Acme')).toBeNull()
    expect(postingFeatures({ title: 'Software Engineer - EDG', company: 'MathWorks' })).toMatchObject({ from: 'title', titleLevel: 'entry' })
    const stored = { v: 1, skills: {}, band: null, from: null, titleLevel: null }
    expect(withTitleLevel(stored, 'Software Engineer - EDG', 'MathWorks')).toMatchObject({ band: [0, 2], from: 'title', titleLevel: 'entry' })
  })
})

describe('College Grad', () => {
  it('reads a college or university grad as entry, and nothing that merely mentions a grad', () => {
    expect(titleSays('University Grad - Software Engineer')?.level).toBe('entry')
    expect(titleSays('College Grads - Network Engineer')?.level).toBe('entry')
    expect(titleSays('Gradle Build Engineer')).toBeNull()
    expect(titleSays('Software Engineer (Grade 4)')).toBeNull()
  })
})
