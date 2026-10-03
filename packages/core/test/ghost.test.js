import { describe, it, expect } from 'vitest'
import { ghostSignals, legitimacy, TOOL_TERMS } from '@jobdekho/core/ghost.js'

const flag = { code: 'fee', reason: 'Asks applicants to pay a ₹1,500 registration fee', evidence: 'x' }

// The web app reads these two fields until it reads `caution` itself, so
// they carry the strict red flags and nothing else.
describe('legitimacy', () => {
  it('reads as Caution only when a red flag exists', () => {
    expect(legitimacy({ caution: [flag] })).toBe('low')
    expect(legitimacy({ caution: [] })).toBe('high')
  })

  // The old rubric flagged Infosys, EY and Google for no pay and a short text.
  it('is clean for a posting with no pay, a short text and an old date', () => {
    const plain = { stipend: null, descriptionText: 'Apply now.', postedAt: '2025-01-01', caution: [] }
    expect(legitimacy(plain)).toBe('high')
    expect(ghostSignals(plain)).toEqual([])
  })

  it('is clean for a posting with no caution list at all', () => {
    expect(legitimacy({})).toBe('high')
    expect(legitimacy(null)).toBe('high')
  })
})

describe('ghostSignals', () => {
  it('says each red flag in its own words', () => {
    expect(ghostSignals({ caution: [flag, { code: 'shared-ad', reason: 'The same ad appears under 5 company names' }] }))
      .toEqual(['Asks applicants to pay a ₹1,500 registration fee', 'The same ad appears under 5 company names'])
  })
})

describe('TOOL_TERMS', () => {
  it('still lists the tools the resume tailoring starts from', () => {
    expect(TOOL_TERMS).toContain('python')
    expect(TOOL_TERMS).toContain('kubernetes')
  })
})
