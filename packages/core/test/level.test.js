import { describe, it, expect } from 'vitest'
import { classifyLevel, levelRank, LEVELS } from '@jobdekho/core/level.js'

describe('classifyLevel', () => {
  it('reads the obvious title markers', () => {
    expect(classifyLevel('Software Engineering Intern')).toBe('internship')
    expect(classifyLevel('Graduate Software Engineer')).toBe('entry')
    expect(classifyLevel('Software Engineer')).toBe('mid')
    expect(classifyLevel('Senior Software Engineer')).toBe('senior')
    expect(classifyLevel('Staff Data Scientist')).toBe('staff')
    expect(classifyLevel('Director of Engineering')).toBe('executive')
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
    expect(classifyLevel('Internal Tools Engineer')).toBe('mid')
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
    expect(classifyLevel('Backend Developer', 'no numbers here')).toBe('mid')
  })

  // Company prose mentions years too; only requirement-shaped years count.
  it('ignores years that are not an experience requirement', () => {
    expect(classifyLevel('Software Engineer', 'We were founded 12 years ago and build tools.')).toBe('mid')
    expect(classifyLevel('Software Engineer', 'Our product is 3 years old.')).toBe('mid')
  })

  it('does not read a body mention of interns as an internship', () => {
    expect(classifyLevel('Software Engineer', 'You will mentor our interns.')).toBe('mid')
  })

  // Amazon's qualifications, on every engineering role it posts in India.
  it('does not read "non-internship experience" as an internship', () => {
    const body = 'Basic qualifications - 3+ years of non-internship professional software development experience'
    expect(classifyLevel('Software Development Engineer', body)).toBe('mid')
    expect(classifyLevel('Data Engineer', 'Prior internship experience with SQL is a plus.')).toBe('mid')
    expect(classifyLevel('Software Engineer', 'This is a 6-month internship in Pune.')).toBe('internship')
  })

  it('reads the rank at the end of the role when the team follows it', () => {
    expect(classifyLevel('Software Development Engineer II, Prime Video Resilience, Prime Video App Experience')).toBe('mid')
    expect(classifyLevel('SysDE I - Multimedia, Silicon and Systems Group')).toBe('entry')
    expect(classifyLevel('Data Engineer III | Payments')).toBe('senior')
  })

  it('does not read a team number as a rank', () => {
    expect(classifyLevel('Software Engineer - Team 1')).toBe('mid')
    expect(classifyLevel('SDE - Group 2')).toBe('mid')
  })

  it('prefers a source-declared level over inference', () => {
    expect(classifyLevel('Software Engineer', 'intern programme')).toBe('internship')
  })

  it('ranks levels in ladder order and defaults unknowns to mid', () => {
    expect(levelRank('internship')).toBeLessThan(levelRank('executive'))
    expect(levelRank('nonsense')).toBe(LEVELS.indexOf('mid'))
  })

  // A stored body now starts each list item with "- ", so a number ending one
  // line and a bullet opening the next must not read as a range.
  it('does not read a range across a line break', () => {
    expect(classifyLevel('Engineer', 'Openings: 12\n- 5 years in Go')).toBe('senior')
    expect(classifyLevel('Engineer', 'Need 2 - 4 years of experience')).toBe('mid')
  })
})
