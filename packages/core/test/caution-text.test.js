import { describe, it, expect } from 'vitest'
import { withoutNotices, negated } from '@jobdekho/core/caution-text.js'
import { sentenceAt } from '@jobdekho/core/text-layout.js'

describe('withoutNotices', () => {
  it('drops a notice to the end of its paragraph', () => {
    const text = 'Build APIs.\n\nPlease beware of fraudsters. They may ask for a fee of Rs 500.\nNever pay anyone.\n\nShip weekly.'
    expect(withoutNotices(text)).toBe('Build APIs.\n\n\nShip weekly.')
  })

  // A heading "Fraud alert" covers the paragraph under it too.
  it('drops the paragraph under a notice heading', () => {
    const text = 'Fraud alert\n\nSomeone may ask you for a registration fee of Rs 2000.\n\nShip weekly.'
    expect(withoutNotices(text)).not.toContain('registration fee')
    expect(withoutNotices(text)).toContain('Ship weekly.')
  })

  it('keeps text with no notice', () => {
    expect(withoutNotices('Pay a registration fee of Rs 999.')).toBe('Pay a registration fee of Rs 999.')
  })
})

describe('negated', () => {
  const at = (text, word) => negated(text, text.indexOf(word), word.length)

  it('reads a negation before the words or a nil after them', () => {
    expect(at('There is no registration fee.', 'registration fee')).toBe(true)
    expect(at('We do not charge any training fee.', 'training fee')).toBe(true)
    expect(at('Registration fee: Nil', 'Registration fee')).toBe(true)
    expect(at('Placement fee is borne by the company', 'Placement fee')).toBe(true)
  })

  it('leaves a plain statement, and a negation in another sentence', () => {
    expect(at('Pay a registration fee of Rs 999.', 'registration fee')).toBe(false)
    expect(at('No laptops are given. A training fee of Rs 999 applies.', 'training fee')).toBe(false)
  })
})

describe('sentenceAt', () => {
  it('cuts at a sentence end before a capital, never at an abbreviation', () => {
    const text = 'Apply now. Pay a fee of Rs. 1,500 before joining. Thanks.'
    expect(sentenceAt(text, text.indexOf('fee'))).toBe('Pay a fee of Rs. 1,500 before joining.')
  })

  it('never crosses a line', () => {
    const text = 'Salary range:\nINR 12,00,000 per year\nApply'
    expect(sentenceAt(text, text.indexOf('INR'))).toBe('INR 12,00,000 per year')
  })
})
