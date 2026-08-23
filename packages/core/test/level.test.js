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
    expect(classifyLevel('Backend Developer', 'no numbers here')).toBe('mid')
  })

  it('prefers a source-declared level over inference', () => {
    expect(classifyLevel('Software Engineer', 'intern programme')).toBe('internship')
  })

  it('ranks levels in ladder order and defaults unknowns to mid', () => {
    expect(levelRank('internship')).toBeLessThan(levelRank('executive'))
    expect(levelRank('nonsense')).toBe(LEVELS.indexOf('mid'))
  })
})
