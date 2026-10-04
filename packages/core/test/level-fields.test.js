import { describe, it, expect } from 'vitest'
import { fieldsIn } from '@jobdekho/core/level-fields.js'
import { ladderIn } from '@jobdekho/core/level-ladders.js'

const read = (text) => fieldsIn(text).map(({ level, evidence }) => ({ level, evidence }))

describe('fieldsIn', () => {
  it('reads a level field in plain level words', () => {
    expect(read('Job Description & Summary\n\nLevel: Senior Associate\n\nLocation: Bangalore'))
      .toEqual([{ level: 'senior', evidence: 'Level field: Senior Associate' }])
    expect(read('Seniority level: Entry level')).toEqual([{ level: 'entry', evidence: 'Seniority level field: Entry level' }])
    expect(read('Location: Chennai · Team: Performance Engineering · Level: Senior')).toEqual([{ level: 'senior', evidence: 'Level field: Senior' }])
    expect(read('Location: Pune, India\nLevel: Director\nJob Family: Product Management')).toEqual([{ level: 'executive', evidence: 'Level field: Director' }])
  })

  it('never reads a field that names two levels', () => {
    expect(read('Seniority level: Mid-Senior level')).toEqual([])
    expect(read('Experience Level: Senior Architect / Principal Consultant.')).toEqual([])
  })

  // A company's code means what its own ladder says, and a bank's corporate
  // title is a different rung at every bank.
  it('never reads a company code or a corporate title', () => {
    expect(read('Career Level - IC4')).toEqual([])
    expect(read('Analyst \u2013 ICS Pay Over Time Band: B30')).toEqual([])
    expect(read('Job Level: JL3 / JL4 (Based on Experience) 1-6 Yrs')).toEqual([])
    expect(read('Management Level: 9-Team Lead/Consultant')).toEqual([])
    expect(read('Corporate Title: Associate')).toEqual([])
  })

  it('never reads a level that is not a field of the role', () => {
    expect(read('Proficiency level: Senior')).toEqual([])
    expect(read('You will work at a senior level: owning design reviews.')).toEqual([])
  })
})

describe('ladderIn', () => {
  const block = (rank) => `- Implementation of effective unit testing practices.\n\n${rank} Expectations\n\n- To advise and influence decision making.`

  it("reads Barclays' Assistant Vice President and Vice President blocks as senior, as a bank rank", () => {
    expect(ladderIn(block('Assistant Vice President'), 'Barclays'))
      .toEqual([{ level: 'senior', evidence: 'Says "Assistant Vice President Expectations", a bank rank', rule: 'ladder' }])
    expect(ladderIn(block('Vice President'), 'Barclays')).toMatchObject([{ level: 'senior' }])
  })

  // Barclays files a "Senior Test Engineer" under its Analyst block too.
  it("leaves Barclays' Analyst block unknown", () => {
    expect(ladderIn(block('Analyst'), 'Barclays')).toEqual([])
  })

  it("never reads one company's ladder for another", () => {
    expect(ladderIn(block('Assistant Vice President'), 'Acme Bank')).toEqual([])
    expect(ladderIn('Career Level - IC4', 'Oracle')).toEqual([])
  })
})
