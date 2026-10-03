import { describe, it, expect } from 'vitest'
import { payLabel } from '@jobdekho/core/pay-label.js'

describe('payLabel', () => {
  it('writes the short forms the design names', () => {
    expect(payLabel('₹ 4,00,000 /year')).toBe('₹4L/yr')
    expect(payLabel('₹ 15,000 /month')).toBe('₹15k/mo')
    expect(payLabel('1.2 Cr')).toBe('₹1.2 Cr/yr')
    expect(payLabel('$80k - $150k')).toBe('$80k to $150k/yr')
  })

  // Every dollar figure once wore a rupee sign.
  it('keeps each currency its own sign', () => {
    expect(payLabel('USD 200,000 - 270,000 /year', 'USD')).toBe('$200k to $270k/yr')
    expect(payLabel('£50,000 /year')).toBe('£50k/yr')
    expect(payLabel('INR 7.4m - 9.8m')).toBe('₹74L to ₹98L/yr')
  })

  it('reads the period stated, else the one the amount implies', () => {
    expect(payLabel('$30 - $45 /hour')).toBe('$30 to $45/hr')
    expect(payLabel('₹ 8,000 - 12,000')).toBe('₹8k to ₹12k/mo')
    expect(payLabel('₹ 6,00,000')).toBe('₹6L/yr')
    expect(payLabel('₹ 4,50,000 per annum')).toBe('₹4.5L/yr')
  })

  it('says Unpaid, and nothing for a text with no amount', () => {
    expect(payLabel('Unpaid')).toBe('Unpaid')
    expect(payLabel('Competitive salary')).toBeNull()
    expect(payLabel('$0k - $0k /year')).toBeNull()
    expect(payLabel(null)).toBeNull()
  })
})
