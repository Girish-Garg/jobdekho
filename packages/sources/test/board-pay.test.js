import { describe, it, expect } from 'vitest'
import { payRange, workplace } from '@jobdekho/sources/providers/board-pay.js'

describe('payRange', () => {
  it('writes a range with its currency code first and the period it names', () => {
    expect(payRange({ min: 2755300, max: 3100000, currency: 'INR', period: 'Annual base salary range' }))
      .toBe('INR 2,755,300 - 3,100,000 /year')
    expect(payRange({ min: 80000, max: 150000, currency: 'usd', period: 'per-year-salary' })).toBe('USD 80,000 - 150,000 /year')
    expect(payRange({ min: 30, max: 45, currency: 'USD', period: 'Hourly pay' })).toBe('USD 30 - 45 /hour')
    expect(payRange({ min: 25000, max: 25000, currency: 'INR', period: '1 MONTH' })).toBe('INR 25,000 /month')
  })

  // A board's placeholder of zeroes is no pay, and an unnamed period is left off.
  it('gives nothing for a range with no amount, and no period it was not given', () => {
    expect(payRange({ min: 0, max: 0, currency: 'USD', period: 'year' })).toBeNull()
    expect(payRange({ min: null, max: undefined, currency: 'INR' })).toBeNull()
    expect(payRange({ min: 0, max: 50000, currency: 'EUR', period: 'one-time' })).toBe('EUR 50,000')
  })
})

describe('workplace', () => {
  it('reads Ashby and Lever spellings as one word', () => {
    expect(workplace('OnSite')).toEqual({ workMode: 'onsite' })
    expect(workplace('on-site')).toEqual({ workMode: 'onsite' })
    expect(workplace('Remote')).toEqual({ workMode: 'remote' })
    expect(workplace('hybrid')).toEqual({ workMode: 'hybrid' })
  })

  it('says nothing for an unspecified or missing field', () => {
    expect(workplace('unspecified')).toEqual({})
    expect(workplace(null)).toEqual({})
  })
})
