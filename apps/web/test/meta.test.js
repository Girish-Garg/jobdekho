import { describe, it, expect } from 'vitest'
import { stipendAmount, durationMonths, experienceYears } from '../src/lib/meta.js'

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

describe('experienceYears', () => {
  it('returns 0 for Fresher', () => {
    expect(experienceYears('Fresher')).toBe(0)
  })
  it('returns first number for range', () => {
    expect(experienceYears('2-4 years')).toBe(2)
  })
  it('returns number for single value', () => {
    expect(experienceYears('5 years')).toBe(5)
  })
  it('returns 0 for null', () => {
    expect(experienceYears(null)).toBe(0)
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
