import { describe, it, expect } from 'vitest'
import { classifyLevel, levelTag, levelRank, LEVELS } from '@jobdekho/core/level.js'
import { TAGS_VERSION } from '@jobdekho/core/tag.js'

describe('classifyLevel', () => {
  it('reads the obvious title markers', () => {
    expect(classifyLevel('Software Engineering Intern')).toBe('internship')
    expect(classifyLevel('Graduate Software Engineer')).toBe('entry')
    expect(classifyLevel('Senior Software Engineer')).toBe('senior')
    expect(classifyLevel('Staff Data Scientist')).toBe('staff')
    expect(classifyLevel('Director of Engineering')).toBe('executive')
  })

  // A fifth of postings once showed Mid only because nothing was known.
  it('leaves a title and body that say nothing as unknown, never mid', () => {
    expect(classifyLevel('Software Engineer')).toBeNull()
    expect(classifyLevel('Backend Developer', 'no numbers here')).toBeNull()
    expect(levelTag({ title: 'Software Engineer' })).toBeNull()
  })

  it('lets an explicit seniority word outrank a role word', () => {
    expect(classifyLevel('Associate Product Manager')).toBe('entry')
    expect(classifyLevel('Senior Associate')).toBe('senior')
    expect(classifyLevel('Engineering Manager')).toBe('senior')
  })

  it('reads a trailing rank when no word marker is present', () => {
    expect(classifyLevel('Software Engineer I')).toBe('entry')
    expect(classifyLevel('Software Engineer II')).toBe('mid')
    expect(classifyLevel('SDE 3')).toBe('senior')
    expect(classifyLevel('Data Analyst IV')).toBe('staff')
  })

  it('does not mistake "internal" for an internship', () => {
    expect(classifyLevel('Internal Tools Engineer')).toBeNull()
  })

  it('reads a years range embedded in the title', () => {
    expect(classifyLevel('Firmware Engineer(5-7 years)')).toBe('senior')
    expect(classifyLevel('Backend Developer 2-4 years')).toBe('mid')
    // A trailing rank still wins over any digits earlier in the title.
    expect(classifyLevel('Software Engineer II')).toBe('mid')
  })

  it('falls back to years of experience in the body', () => {
    expect(classifyLevel('Backend Developer', 'We want 7 years of experience')).toBe('senior')
    expect(classifyLevel('Backend Developer', 'Looking for 2-4 years')).toBe('mid')
    expect(classifyLevel('Backend Developer', 'experience: 5 years')).toBe('senior')
    expect(classifyLevel('Backend Developer', '3 yrs exp')).toBe('mid')
  })

  // Company prose mentions years too; only requirement-shaped years count.
  it('ignores years that are not an experience requirement', () => {
    expect(classifyLevel('Software Engineer', 'We were founded 12 years ago and build tools.')).toBeNull()
    expect(classifyLevel('Software Engineer', 'Our product is 3 years old.')).toBeNull()
  })

  it('does not read a body mention of interns as an internship', () => {
    expect(classifyLevel('Software Engineer', 'You will mentor our interns.')).toBeNull()
  })

  // Amazon's qualifications, on every engineering role it posts in India.
  it('does not read "non-internship experience" as an internship', () => {
    const body = 'Basic qualifications - 3+ years of non-internship professional software development experience'
    expect(classifyLevel('Software Development Engineer', body)).toBe('mid')
    expect(classifyLevel('Data Engineer', 'Prior internship experience with SQL is a plus.')).toBeNull()
    expect(classifyLevel('Software Engineer', 'This is a 6-month internship in Pune.')).toBe('internship')
  })

  it('reads the rank at the end of the role when the team follows it', () => {
    expect(classifyLevel('Software Development Engineer II, Prime Video Resilience, Prime Video App Experience')).toBe('mid')
    expect(classifyLevel('SysDE I - Multimedia, Silicon and Systems Group')).toBe('entry')
    expect(classifyLevel('Data Engineer III | Payments')).toBe('senior')
  })

  it('does not read a team number as a rank', () => {
    expect(classifyLevel('Software Engineer - Team 1')).toBeNull()
    expect(classifyLevel('SDE - Group 2')).toBeNull()
  })

  it('reads a programme the body states', () => {
    expect(classifyLevel('Software Engineer', 'intern programme')).toBe('internship')
  })

  // A stored body starts each list item with "- ", so a number ending one
  // line and a bullet opening the next must not read as a range.
  it('does not read a range across a line break', () => {
    expect(classifyLevel('Engineer', 'Openings: 12\n- 5 years in Go')).toBe('senior')
    expect(classifyLevel('Engineer', 'Need 2 - 4 years of experience')).toBe('mid')
  })
})

describe('levelTag', () => {
  it('states where each level came from, with its words', () => {
    expect(levelTag({ title: 'Senior Software Engineer' })).toEqual({ value: 'senior', from: 'title', evidence: 'Title says Senior', version: TAGS_VERSION })
    expect(levelTag({ title: 'Engineer', description: 'You bring 3 to 5 years of experience.' }))
      .toMatchObject({ value: 'mid', from: 'text', evidence: 'Asks for 3 to 5 years' })
    expect(levelTag({ title: 'Engineer', description: 'This is a 6-month internship in Pune.' }))
      .toMatchObject({ value: 'internship', from: 'text', evidence: 'Says "This is a 6-month internship"' })
  })

  it('puts the board first: its internship list, then its employment type', () => {
    expect(levelTag({ title: 'React Native Development', source: 'internshala', board: { type: 'internship' } }))
      .toMatchObject({ value: 'internship', from: 'board', evidence: 'Internshala lists it as an internship' })
    expect(levelTag({ title: 'Senior Analyst', board: { type: 'internship', employment: 'Intern' } }))
      .toMatchObject({ value: 'internship', from: 'board', evidence: 'Employment type: Intern' })
  })

  // A board-declared job is never made an internship from its text, unless
  // the title itself says Intern.
  it('never infers an internship for a posting the board filed as a job', () => {
    const body = 'This is a 6-month internship with a stipend.'
    expect(levelTag({ title: 'Data Analyst', description: body, board: { type: 'job' } })).toBeNull()
    expect(levelTag({ title: 'Data Analytics Trainee', description: body, board: { type: 'job' } })).toMatchObject({ value: 'entry' })
    expect(levelTag({ title: 'Architecture Internship', board: { type: 'job' } })).toMatchObject({ value: 'internship', from: 'title' })
  })

  // Recruiters fill experience from a picker, so it speaks last.
  it('uses the board experience field only when the text gives no years', () => {
    expect(levelTag({ title: 'Analyst', experience: 'Fresher', experienceYears: 0 }))
      .toMatchObject({ value: 'entry', from: 'board', evidence: 'Experience field: Fresher' })
    expect(levelTag({ title: 'Analyst', description: '5+ years of SQL', experience: 'Fresher', experienceYears: 0 }))
      .toMatchObject({ value: 'senior', from: 'text' })
  })

  it('reads months of experience as entry', () => {
    expect(levelTag({ title: 'Software Engineering', description: '6+ months work or internship proven experience coding' }))
      .toMatchObject({ value: 'entry', from: 'text', evidence: 'Asks for 6 months of experience' })
    expect(levelTag({ title: 'Engineer', description: 'A 6 month project.' })).toBeNull()
  })
})

describe('levelRank', () => {
  it('ranks levels in ladder order and gives an unknown level no rank at all', () => {
    expect(levelRank('internship')).toBeLessThan(levelRank('executive'))
    expect(levelRank('mid')).toBe(LEVELS.indexOf('mid'))
    expect(levelRank('nonsense')).toBe(-1)
    expect(levelRank(null)).toBe(-1)
  })
})
