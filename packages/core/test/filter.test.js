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
