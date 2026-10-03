import { describe, it, expect } from 'vitest'
import { postingFacts } from '@jobdekho/core/posting-facts.js'
import { tag } from '@jobdekho/core/tag.js'

const row = (over = {}) => ({
  title: 'Engineer', company: 'Acme', descriptionText: '', experience: null, experienceYears: null,
  stipend: null, currency: null, stipendMin: null, payTag: null, workModeTag: null, ...over,
})

describe('postingFacts', () => {
  it('states the years asked with the line they came from', () => {
    const facts = postingFacts(row({ descriptionText: 'Requirements:\n- 3-5 years of experience in Go\n- 2+ years of React' }))
    expect(facts.years).toEqual({ min: 3, max: 5, from: 'text', evidence: 'Says "3-5 years of experience in Go"' })
  })

  // "5+ years" names no top; the band's is assumed, so it is left out.
  it('gives no top for a floor alone, and reads the board field after the text', () => {
    expect(postingFacts(row({ descriptionText: 'Requirements:\n- 5+ years of Go' })).years).toMatchObject({ min: 5, max: null })
    expect(postingFacts(row({ experience: '1 year(s)', experienceYears: 1 })).years)
      .toEqual({ min: 1, max: null, from: 'board', evidence: 'Experience field: 1 year(s)' })
  })

  // A title level is the level chip's to say, not a number of years.
  it('states no years for a title alone', () => {
    expect(postingFacts(row({ title: 'Senior Engineer' })).years).toBeNull()
  })

  it('states pay with its short form, currency and evidence', () => {
    const payTag = tag('$80k - $150k', 'text', 'Says "Expected salary: $80k - $150k"')
    expect(postingFacts(row({ stipend: '$80k - $150k', currency: 'USD', stipendMin: 566667, payTag })).pay).toEqual({
      value: '$80k - $150k', label: '$80k to $150k/yr', currency: 'USD', monthly: 566667, from: 'text', evidence: 'Says "Expected salary: $80k - $150k"',
    })
    expect(postingFacts(row()).pay).toBeNull()
  })

  it('states the work mode as its tag does', () => {
    const workModeTag = tag('hybrid', 'text', 'Says "Workplace type: Hybrid"')
    expect(postingFacts(row({ workModeTag })).workMode).toEqual({ value: 'hybrid', from: 'text', evidence: 'Says "Workplace type: Hybrid"' })
    expect(postingFacts(row()).workMode).toBeNull()
  })
})
