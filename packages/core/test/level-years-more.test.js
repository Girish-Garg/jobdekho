import { describe, it, expect } from 'vitest'
import { moreYears } from '@jobdekho/core/level-years-more.js'
import { yearsLevel } from '@jobdekho/core/level-years.js'

// Sentences as the readers receive them; a wished one sits under a Preferred
// or Nice to have heading.
const unit = (text, wished = false) => ({ text, section: wished ? 'nice' : 'req', wished })
const read = (...units) => {
  const got = moreYears(units.map((u) => (typeof u === 'string' ? unit(u) : u)))
  return got && { level: got.level, evidence: got.evidence }
}

describe('moreYears', () => {
  it('reads words between the amount and "experience"', () => {
    expect(read('BS or MS in Electronics Engineering with at least 3 years of relevant experience.')).toEqual({ level: 'mid', evidence: 'Asks for 3 years' })
    expect(read('5 year\'s of relevant experience')).toEqual({ level: 'senior', evidence: 'Asks for 5 years' })
    expect(read('Minimum 3 Year hands on experience in DC Drives.')).toEqual({ level: 'mid', evidence: 'Asks for 3 years' })
    expect(read('At least 3 years’ experience in network design, and implementation')).toEqual({ level: 'mid', evidence: 'Asks for 3 years' })
    expect(read('Have 2 years or more experience in an IT support role.')).toEqual({ level: 'mid', evidence: 'Asks for 2 years' })
    expect(read('Minimum 12 year(s) of experience is required')).toEqual({ level: 'staff', evidence: 'Asks for 12 years' })
  })

  it('reads amounts in words, and ranges written with them', () => {
    expect(read('At least three years of experience in a quantitative environment.')).toEqual({ level: 'mid', evidence: 'Asks for 3 years' })
    expect(read('Minimum three to five years of hands-on experience in refrigeration systems.')).toEqual({ level: 'mid', evidence: 'Asks for 3 to 5 years' })
    expect(read('Typically gained across five to eight years of professional experience.')).toEqual({ level: 'senior', evidence: 'Asks for 5 to 8 years' })
  })

  it('reads a range with a ceiling as a range, never as the ceiling', () => {
    expect(read('Minimum of 6 years and upto 12 years of relevant experience with a Bachelor’s degree.')).toEqual({ level: 'senior', evidence: 'Asks for 6 to 12 years' })
    expect(read('A minimum of 4 years and maximum of 7 years of Information Systems experience.')).toEqual({ level: 'mid', evidence: 'Asks for 4 to 7 years' })
  })

  it('reads a labelled amount the strict reader passes over', () => {
    expect(read('Exp Level 6Yrs to 9Yrs')).toEqual({ level: 'senior', evidence: 'Asks for 6 to 9 years' })
    expect(read('1. 6Yrs to 8Yrs hands on Experience in embedded SW development')).toEqual({ level: 'senior', evidence: 'Asks for 6 to 8 years' })
    expect(read('Experience : At least 3 years of relevant professional or applied research experience.')).toEqual({ level: 'mid', evidence: 'Asks for 3 years' })
  })

  it('reads a ceiling from zero', () => {
    expect(read('Up to 2 years of experience in a support role.')).toEqual({ level: 'entry', evidence: 'Asks for up to 2 years' })
    expect(read('Fresh graduates or candidates with less than 2 years of working experience are welcome to apply')).toEqual({ level: 'entry', evidence: 'Asks for less than 2 years' })
  })

  it('never reads years that are not experience asked', () => {
    expect(read('We have been innovating fearlessly for 40 years to create solutions.')).toBeNull()
    expect(read('Complementary Health screening for 35 yrs. and above')).toBeNull()
    expect(read('Educational Qualification: 15 years full time education')).toBeNull()
    expect(read('Halving the number of struggling readers within 5 years.')).toBeNull()
    expect(read('A 2 year bond applies to this role.')).toBeNull()
  })

  // A company boasting of its age names more years than any role asks.
  it('never reads more than twenty years', () => {
    expect(read('With over 25 years of industry experience, Acme leads the market.')).toBeNull()
  })

  it('reads the amount of the bachelor’s path when degrees each give one', () => {
    expect(read('Bachelors + 7 years of related experience, or Masters + 4 years of related experience, or PhD + 1 year of related experience'))
      .toEqual({ level: 'senior', evidence: 'Asks for 7 years' })
    expect(read('Bachelor’s Degree with at least 2 years of working experience OR Master’s Degree with 1 year of working experience.'))
      .toEqual({ level: 'mid', evidence: 'Asks for 2 years' })
  })

  // "Master's and 1 year, Bachelor's and 3" is not an entry-level role, and
  // "M.Tech; or B.Tech with 2 years" asks nothing of the M.Tech.
  it('leaves an amount that belongs to another degree path unknown', () => {
    expect(read("Minimally requires a Master's degree and 1 years of related experience, Bachelor's degree and 3 years of related experience, or high school degree and 5 years of related experience.")).toBeNull()
    expect(read('M.Tech/M.E. in Computer Science, Information Technology, or a related field; or B.Tech/B.E. in a relevant discipline with at least 2 years of relevant professional experience.')).toBeNull()
  })

  it('reads a single degree path as stated', () => {
    expect(read('Master’s degree in Mechanical Engineering or closely related field, plus a minimum of 2 years relevant experience.')).toEqual({ level: 'mid', evidence: 'Asks for 2 years' })
  })

  it('takes the first sentence that states an amount', () => {
    expect(read('Strong Python skills.', 'At least 5 years of professional experience with Python.', '2 years of team lead experience.'))
      .toEqual({ level: 'senior', evidence: 'Asks for 5 years' })
  })

  // Years a posting would like rather than asks never decide a level.
  it('never reads an amount that is only wished for', () => {
    expect(read('Prefer 2 years’ industry work experience with experience in project costing.')).toBeNull()
    expect(read('3 years of hands-on experience in Virtual Manufacturing assembly process planning will be added advantages')).toBeNull()
    expect(read('Early-career experience, with up to 4 years of relevant professional experience preferred.')).toBeNull()
    expect(read('Candidates with 3 years of relevant experience are a plus.')).toBeNull()
    expect(read('Bonus: 2 years of hands-on experience with Rust.')).toBeNull()
    expect(read(unit('- 4 years of professional experience with Kafka', true))).toBeNull()
  })

  it('reads the amount asked beside one that is wished for', () => {
    expect(read('Minimum 5 years of experience in Java; knowledge of Kafka is a plus.')).toEqual({ level: 'senior', evidence: 'Asks for 5 years' })
    expect(read('2 years of Rust experience is a plus; minimum 5 years of experience in Java.')).toEqual({ level: 'senior', evidence: 'Asks for 5 years' })
    expect(read(unit('3 years of Rust experience.', true), 'Minimum 5 years of experience in Java.')).toEqual({ level: 'senior', evidence: 'Asks for 5 years' })
  })

  // Some boards run the next heading into the last requirement.
  it('never lets a heading run into a requirement make it optional', () => {
    expect(read('Bachelors + 7 years of related experience, or Masters + 4 years of related experience, or PhD + 1 year of related experience Preferred Qualifications Varies based on the team and business needs'))
      .toEqual({ level: 'senior', evidence: 'Asks for 7 years' })
  })

  // Only what the strict reader misses reaches here; it keeps its own reading.
  it('leaves what the strict reader reads to it', () => {
    expect(yearsLevel('at least 3 years of relevant experience')).toBeNull()
    expect(yearsLevel('3-5 years of experience')).toEqual({ level: 'mid', evidence: 'Asks for 3 to 5 years' })
  })
})
