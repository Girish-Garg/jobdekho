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

  // RemoteOK rounds an unset salary to "$0k - $0k"; read as unpaid it sank
  // to the bottom of every pay sort.
  it('reads a zero that does not say unpaid as no pay stated', () => {
    expect(stipendMonthly('$0k - $0k /year')).toBeNull()
    expect(stipendMonthly('₹ 0 /month')).toBeNull()
    expect(stipendMonthly('Unpaid (₹ 0)')).toBe(0)
  })

  // Explicitly unpaid is a real answer; a missing figure is not.
  it('separates unpaid from unknown', () => {
    expect(stipendMonthly('Unpaid')).toBe(0)
    expect(stipendMonthly('')).toBeNull()
    expect(stipendMonthly(null)).toBeNull()
    expect(stipendMonthly('Competitive')).toBeNull()
  })

  // An hourly rate is neither yearly nor monthly. Read as a monthly figure it
  // put every contract and US listing at the bottom of a pay sort: "$14/hour"
  // stored as 14 rupees a month.
  it('scales an hourly rate to a month', () => {
    expect(stipendMonthly('$14/hour')).toBe(190400)
    expect(stipendMonthly('$17/hr')).toBe(231200)
    expect(stipendMonthly('$120 - $170 /hour')).toBe(1632000)
  })

  // The rupee and lakh paths must not be disturbed by the hourly branch.
  it('still reads the rupee cases it always did', () => {
    expect(stipendMonthly('6 LPA')).toBe(50000)
    expect(stipendMonthly('Rs 10,000 - 15,000 /month')).toBe(10000)
    expect(stipendMonthly('Unpaid')).toBe(0)
  })

  // Each of these was misread before: "₹2.2M" (YC and Ashby write pay that
  // way) came out as 22 lakh a month, CTC and "annually" were taken for a
  // month, and crores and a bare "L" lost their unit altogether.
  it('reads millions, crores and lakhs as a year of pay', () => {
    expect(stipendMonthly('₹2.2M - ₹3.5M INR')).toBe(183333)
    expect(stipendMonthly('1.2 Cr')).toBe(1000000)
    expect(stipendMonthly('0.8 - 1.2 Cr')).toBe(666667)
    expect(stipendMonthly('8L-12L per annum')).toBe(66667)
    expect(stipendMonthly('12 - 15 L')).toBe(100000)
    expect(stipendMonthly('3.5 Lakhs per annum')).toBe(29167)
    expect(stipendMonthly('Up to 30 LPA')).toBe(250000)
  })

  it('takes CTC and annually as yearly', () => {
    expect(stipendMonthly('Rs. 6,00,000 CTC')).toBe(50000)
    expect(stipendMonthly('INR 1,200,000 - 1,800,000 annually')).toBe(100000)
  })

  // Unstop sends a job's salary and an internship's stipend as the same
  // bare "Rs a - b": from a lakh up it can only be a year's pay.
  it('reads a bare rupee figure as monthly below a lakh and yearly from one', () => {
    expect(stipendMonthly('Rs 10000 - 15000')).toBe(10000)
    expect(stipendMonthly('Rs 600000')).toBe(50000)
  })

  it('lets a stated month win over a yearly unit or a large figure', () => {
    expect(stipendMonthly('₹ 1,20,000 per month')).toBe(120000)
    expect(stipendMonthly('₹1 lakh per month')).toBe(100000)
    expect(stipendMonthly('15,000 p.m.')).toBe(15000)
    expect(stipendMonthly('$6K - $7.5K / monthly')).toBe(510000)
  })

  it('borrows a range unit from its high end', () => {
    expect(stipendMonthly('10-15k')).toBe(10000)
    expect(stipendMonthly('12-18 LPA')).toBe(100000)
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
