import { describe, it, expect } from 'vitest'
import { payFields } from '@jobdekho/core/pay.js'
import { TAGS_VERSION } from '@jobdekho/core/tag.js'

describe('payFields', () => {
  it('takes the board pay field first, and says so', () => {
    expect(payFields({ stipend: '₹ 10,000 /month', description: 'Salary: $90k' })).toEqual({
      stipend: '₹ 10,000 /month', stipendMin: 10000, currency: 'INR',
      payTag: { value: '₹ 10,000 /month', from: 'board', evidence: 'Pay field: ₹ 10,000 /month', version: TAGS_VERSION },
    })
  })

  // Dollars stay dollars: the currency is what was quoted.
  it('reads pay the description states when the board gives none', () => {
    const got = payFields({ stipend: null, description: 'Expected salary: $80k - $150k' })
    expect(got).toMatchObject({ stipend: '$80k - $150k', currency: 'USD', payTag: { from: 'text', evidence: 'Says "Expected salary: $80k - $150k"' } })
    expect(got.stipendMin).toBeGreaterThan(0)
  })

  // "$0k - $0k" is a placeholder, not unpaid.
  it('reads a zero placeholder as no pay, and lets the text speak', () => {
    expect(payFields({ stipend: '$0k - $0k /year', description: '' })).toEqual({ stipend: null, stipendMin: null, currency: null, payTag: null })
    expect(payFields({ stipend: '$0k - $0k /year', description: 'Salary: $90k - $120k' }).payTag.from).toBe('text')
  })

  it('keeps an honest unpaid and the board words that name no figure', () => {
    expect(payFields({ stipend: 'Unpaid' })).toMatchObject({ stipend: 'Unpaid', stipendMin: 0 })
    expect(payFields({ stipend: 'Competitive salary' })).toMatchObject({ stipend: 'Competitive salary', stipendMin: null, payTag: { from: 'board' } })
  })

  it('is empty when nothing states pay', () => {
    expect(payFields({})).toEqual({ stipend: null, stipendMin: null, currency: null, payTag: null })
  })
})
