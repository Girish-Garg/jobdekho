import { describe, it, expect } from 'vitest'
import { stipendMonthly, experienceYears, durationMonths } from '@jobdekho/core/measures.js'

describe('stipendMonthly', () => {
  it('reads a monthly figure as given', () => {
    expect(stipendMonthly('₹ 15,000 /month')).toBe(15000)
    expect(stipendMonthly('₹ 8,100 - 13,000 /month')).toBe(8100)
  })

  // A yearly salary and a monthly stipend have to answer the same filter.
  it('converts yearly pay to monthly', () => {
    expect(stipendMonthly('₹ 3,00,000 - 4,50,000 /year')).toBe(25000)
    expect(stipendMonthly('₹ 6,00,000 per annum')).toBe(50000)
  })

  it('expands the lakhs shorthand', () => {
    expect(stipendMonthly('6 LPA')).toBe(50000)
    expect(stipendMonthly('12 LPA')).toBe(100000)
  })

  // Foreign pay converts at the snapshot rate, so a US salary and an Indian
  // stipend answer the same filter instead of $60k reading as 60 rupees.
  it('converts foreign currency to rupees', () => {
    expect(stipendMonthly('$60k - $80k /year')).toBe(425000)
    expect(stipendMonthly('€48,000 /year')).toBe(380000)
    expect(stipendMonthly('£36,000 per annum')).toBe(330000)
  })

  it('expands the k suffix', () => {
    expect(stipendMonthly('₹ 20k /month')).toBe(20000)
  })

  // US boards quote annual figures without ever saying "per year".
  it('assumes a bare foreign figure is yearly', () => {
    expect(stipendMonthly('$70,000 - $90,000')).toBe(Math.round((70000 / 12) * 85))
    expect(stipendMonthly('$8,000 /month')).toBe(680000)
  })

  // Explicitly unpaid is a real answer; a missing figure is not.
  it('separates unpaid from unknown', () => {
    expect(stipendMonthly('Unpaid')).toBe(0)
    expect(stipendMonthly('')).toBeNull()
    expect(stipendMonthly(null)).toBeNull()
    expect(stipendMonthly('Competitive')).toBeNull()
  })
})

describe('experienceYears', () => {
  it('treats fresher as zero', () => {
    expect(experienceYears('Fresher')).toBe(0)
    expect(experienceYears('No experience required')).toBe(0)
  })

  it('takes the low end of a range', () => {
    expect(experienceYears('2-4 years')).toBe(2)
    expect(experienceYears('5+ years')).toBe(5)
  })

  it('reports unknown as null', () => {
    expect(experienceYears('')).toBeNull()
    expect(experienceYears('Some experience')).toBeNull()
  })
})

describe('durationMonths', () => {
  it('reads months directly', () => {
    expect(durationMonths('6 Months')).toBe(6)
  })

  it('converts weeks and years', () => {
    expect(durationMonths('2 Weeks')).toBe(1)
    expect(durationMonths('8 weeks')).toBe(2)
    expect(durationMonths('1 year')).toBe(12)
  })

  it('reports unknown as null', () => {
    expect(durationMonths('')).toBeNull()
    expect(durationMonths('Ongoing')).toBeNull()
  })
})
