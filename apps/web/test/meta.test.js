import { describe, it, expect } from 'vitest'
import { stipendAmount, durationMonths } from '../src/lib/meta.js'

describe('stipendAmount', () => {
  it('parses amount with commas', () => {
    expect(stipendAmount('₹ 10,000 /month')).toBe(10000)
  })
  it('returns 0 for Unpaid', () => {
    expect(stipendAmount('Unpaid')).toBe(0)
  })
  it('returns 0 for null', () => {
    expect(stipendAmount(null)).toBe(0)
  })
})

describe('durationMonths', () => {
  it('parses months', () => {
    expect(durationMonths('3 Months')).toBe(3)
  })
  it('converts weeks to months rounded', () => {
    expect(durationMonths('6 Weeks')).toBe(2)
  })
  it('returns 0 for null', () => {
    expect(durationMonths(null)).toBe(0)
  })
})
