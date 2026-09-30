import { describe, it, expect } from 'vitest'
import { detectCurrency, INR_PER } from '@jobdekho/core/currency.js'

describe('detectCurrency', () => {
  it('reads symbols and codes', () => {
    expect(detectCurrency('₹ 10,000 /month')).toBe('INR')
    expect(detectCurrency('Rs. 15,000')).toBe('INR')
    expect(detectCurrency('6 LPA')).toBe('INR')
    expect(detectCurrency('$60k - $80k /year')).toBe('USD')
    expect(detectCurrency('70,000 USD')).toBe('USD')
    expect(detectCurrency('€45,000')).toBe('EUR')
    expect(detectCurrency('55,000 EUR')).toBe('EUR')
    expect(detectCurrency('£40,000')).toBe('GBP')
    expect(detectCurrency('40,000 GBP')).toBe('GBP')
  })

  // Indian boards quote bare numbers, so unnamed means rupees.
  it('defaults to INR when no currency is named', () => {
    expect(detectCurrency('10,000 - 15,000 /month')).toBe('INR')
    expect(detectCurrency('')).toBe('INR')
  })

  // "Europe" is a place, "years" contains "rs": neither names a currency.
  it('does not read currency codes out of ordinary words', () => {
    expect(detectCurrency('Europe relocation, 2 years')).toBe('INR')
  })

  // Seen live on a real board: a rupee salary written in Indian grouping but
  // prefixed with "$". Read as dollars it converted to 404 LPA and sat at the
  // top of every pay sort.
  it('reads Indian digit grouping as rupees whatever symbol precedes it', () => {
    expect(detectCurrency('$ 4,76,000 - 6,16,000 /year')).toBe('INR')
    expect(detectCurrency('4,76,000 /year')).toBe('INR')
  })

  it('reads crores, lacs and CTC as rupees', () => {
    expect(detectCurrency('$ 1.2 Cr')).toBe('INR')
    expect(detectCurrency('5 lacs per annum')).toBe('INR')
    expect(detectCurrency('CTC 600000')).toBe('INR')
  })

  // Western grouping is three digits after the comma, so it must not be read
  // as Indian just for having one.
  it('leaves a western-grouped dollar figure as dollars', () => {
    expect(detectCurrency('$45,000 - $50,000')).toBe('USD')
  })
})

describe('INR_PER', () => {
  it('anchors rupees at one and prices the majors above it', () => {
    expect(INR_PER.INR).toBe(1)
    for (const code of ['USD', 'EUR', 'GBP']) expect(INR_PER[code]).toBeGreaterThan(1)
  })
})
