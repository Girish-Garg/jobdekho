import { describe, it, expect } from 'vitest'
import { yearsLevel, monthsAsked, levelForYears } from '@jobdekho/core/level-years.js'

describe('yearsLevel', () => {
  it('reads a range by its floor, in words the hover can show', () => {
    expect(yearsLevel('3-5 years of experience')).toEqual({ level: 'mid', evidence: 'Asks for 3 to 5 years' })
    expect(yearsLevel('5+ years building systems')).toEqual({ level: 'senior', evidence: 'Asks for 5+ years' })
    expect(yearsLevel('2 years of experience')).toEqual({ level: 'mid', evidence: 'Asks for 2 years' })
    expect(yearsLevel('1 year of experience')).toEqual({ level: 'entry', evidence: 'Asks for 1 year' })
  })

  // An en or em dash is a range too: read as nothing, a range left to a
  // later, smaller number read the wrong level.
  it('reads en and em dash ranges', () => {
    expect(yearsLevel('6\u201310 years of experience as a Business Systems Analyst.')).toMatchObject({ level: 'senior', evidence: 'Asks for 6 to 10 years' })
    expect(yearsLevel('1\u20143 years of experience')).toMatchObject({ level: 'entry' })
    expect(yearsLevel('with 3 \u20136 years of experience')).toMatchObject({ level: 'mid', evidence: 'Asks for 3 to 6 years' })
  })

  it('never reads a range across a line, or years that are not asked', () => {
    expect(yearsLevel('Openings: 2\n- Go')).toBeNull()
    expect(yearsLevel('We were founded 12 years ago.')).toBeNull()
  })

  // PwC and Bosch print the amount on a line of its own under a label.
  it('reads a line that is only an amount of years, not under a duration', () => {
    expect(yearsLevel('Years of experience required:\n\n6 years\n\nEducation')).toMatchObject({ level: 'senior', evidence: 'Asks for 6 years' })
    expect(yearsLevel('Additional Information\n\n3 yrs')).toMatchObject({ level: 'mid' })
    expect(yearsLevel('Bond duration\n\n2 years')).toBeNull()
    expect(yearsLevel('Contract period:\n3 years')).toBeNull()
  })
})

describe('monthsAsked', () => {
  it('reads months of experience as entry', () => {
    expect(monthsAsked('6+ months work or internship proven experience')).toEqual({ level: 'entry', evidence: 'Asks for 6 months of experience' })
    expect(monthsAsked('at least 9 months of relevant experience')).toMatchObject({ level: 'entry' })
  })

  it('leaves months that are not experience', () => {
    expect(monthsAsked('A 6 month project.')).toBeNull()
    expect(monthsAsked('Duration: 6 months')).toBeNull()
  })
})

describe('levelForYears', () => {
  it('maps a floor to the ladder', () => {
    expect([0, 1, 2, 4, 5, 8, 9].map(levelForYears)).toEqual(['entry', 'entry', 'mid', 'mid', 'senior', 'senior', 'staff'])
  })
})
