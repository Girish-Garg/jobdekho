import { describe, it, expect } from 'vitest'
import { payInText } from '@jobdekho/core/pay-text.js'

const pay = (text) => payInText(text)?.text ?? null

describe('payInText', () => {
  it('reads the shapes the design names, with the currency they were written in', () => {
    expect(pay('In India, the OTE compensation range for this role is INR 7.4m - 9.8m OTE.')).toBe('INR 7.4m - 9.8m')
    expect(pay('Expected salary: $80k - $150k')).toBe('$80k - $150k')
    expect(pay('Salary: From £50,000 per annum, depending on experience')).toBe('£50,000 /year')
    expect(pay('Stipend: ₹15,000 per month')).toBe('₹15,000 /month')
    expect(pay('CTC: 8-12 LPA')).toBe('8-12 LPA')
  })

  // Coinbase prints its label on one line and the amount on the next.
  it('takes the words of a label on the line above a bare amount', () => {
    const text = 'Annual base salary range (excluding equity and bonus):\n\n₹4,408,400 ₹4,408,400 INR\n\n- Application Limit: 3'
    expect(payInText(text)).toEqual({
      text: '₹4,408,400 /year',
      evidence: 'Annual base salary range (excluding equity and bonus): ₹4,408,400 ₹4,408,400 INR',
    })
  })

  // Pay is never guessed: a figure that is not plainly this job's pay is left.
  it('leaves money that is not the pay', () => {
    expect(pay('We raised $30M in our Series B.')).toBeNull()
    expect(pay('Our platform processed ₹500 crore in transactions.')).toBeNull()
    expect(pay('Hackathon prize: ₹50,000 for the winning team.')).toBeNull()
    expect(pay('Experience with RS485 and HART protocols.')).toBeNull()
    expect(pay('Rs 15,000 for the right person.')).toBeNull()
  })

  // "Up to" is a ceiling, and a daily rate has no honest month.
  it('leaves a ceiling, a day rate and a perk', () => {
    expect(pay('Stipend: Up to ₹10,000 (performance-based)')).toBeNull()
    expect(pay('Salary: ₹800 per day')).toBeNull()
    expect(pay('Monthly Stipend: USD $150 per month via a Brex Card')).toBeNull()
  })

  it('says nothing for a text with no figure', () => {
    expect(payInText('Competitive salary and benefits.')).toBeNull()
    expect(payInText('')).toBeNull()
  })
})
