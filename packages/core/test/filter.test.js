import { describe, it, expect } from 'vitest'
import { filter } from '@jobdekho/core/filter.js'

const rules = {
  includeKeywords: ['software', 'data'],
  excludeKeywords: ['senior'],
  locations: ['india', 'remote'],
  internshipOnly: true,
}
const base = {
  title: 'Software Intern', company: 'C', location: 'Bengaluru, India',
  descriptionSnippet: 'work on software', tags: [],
}

describe('filter', () => {
  it('keeps a relevant internship', () => {
    expect(filter(base, rules)).toBe(true)
  })
  it('drops non-internship roles when internshipOnly', () => {
    expect(filter({ ...base, title: 'Software Engineer' }, rules)).toBe(false)
  })
  it('drops excluded keywords', () => {
    expect(filter({ ...base, title: 'Senior Software Intern' }, rules)).toBe(false)
  })
  it('drops irrelevant keywords', () => {
    expect(filter({ ...base, title: 'Marketing Intern', descriptionSnippet: 'ads' }, rules)).toBe(false)
  })
  it('keeps remote even if city not listed', () => {
    expect(filter({ ...base, location: 'Remote' }, rules)).toBe(true)
  })
})

const open = { includeKeywords: ['software'], excludeKeywords: [], locations: ['india'] }
const senior = { ...base, title: 'Senior Software Engineer', level: 'senior' }

describe('filter levels', () => {
  it('accepts every level when no levels are named', () => {
    expect(filter(senior, open)).toBe(true)
    expect(filter({ ...base, level: 'executive' }, open)).toBe(true)
  })
  it('keeps only the levels asked for', () => {
    expect(filter(senior, { ...open, levels: ['senior', 'staff'] })).toBe(true)
    expect(filter(senior, { ...open, levels: ['internship', 'entry'] })).toBe(false)
  })
  it('infers the level when the posting has not been classified', () => {
    const raw = { ...base, title: 'Staff Software Engineer' }
    expect(filter(raw, { ...open, levels: ['staff'] })).toBe(true)
    expect(filter(raw, { ...open, levels: ['entry'] })).toBe(false)
  })
  it('still honours the older internshipOnly spelling', () => {
    expect(filter(senior, { ...open, internshipOnly: true })).toBe(false)
    expect(filter(base, { ...open, internshipOnly: true })).toBe(true)
  })
})

describe('filter degrees', () => {
  const phdRole = { ...base, degreeMin: 'phd' }
  const bsRole = { ...base, degreeMin: 'bachelors' }

  it('accepts any degree floor when the seeker states none', () => {
    expect(filter(phdRole, open)).toBe(true)
  })
  it('hides roles that need more than the seeker holds', () => {
    expect(filter(phdRole, { ...open, maxDegree: 'masters' })).toBe(false)
    expect(filter(bsRole, { ...open, maxDegree: 'bachelors' })).toBe(true)
  })
  it('lets a higher degree still reach lower floors', () => {
    expect(filter(bsRole, { ...open, maxDegree: 'phd' })).toBe(true)
    expect(filter({ ...base, degreeMin: 'none' }, { ...open, maxDegree: 'bachelors' })).toBe(true)
  })
})

describe('filter keyword edges', () => {
  it('treats an empty include list as no restriction', () => {
    expect(filter({ ...base, title: 'Blacksmith' }, { includeKeywords: [], excludeKeywords: [], locations: ['india'] })).toBe(true)
  })
})
