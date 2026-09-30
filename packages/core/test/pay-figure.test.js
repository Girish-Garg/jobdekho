import { describe, it, expect } from 'vitest'
import { payFigure } from '@jobdekho/core/pay-figure.js'

describe('payFigure', () => {
  it('scales a figure by the unit written beside it', () => {
    expect(payFigure('₹ 20k /month')).toEqual({ value: 20000, annual: false })
    expect(payFigure('₹2.2M')).toEqual({ value: 2200000, annual: true })
    expect(payFigure('1.2 Cr')).toEqual({ value: 12000000, annual: true })
    expect(payFigure('8L')).toEqual({ value: 800000, annual: true })
    expect(payFigure('3.5 Lakhs')).toEqual({ value: 350000, annual: true })
  })

  // The "M" of months and the "L" of locations start a word; neither is a unit.
  it('leaves a letter that begins a word alone', () => {
    expect(payFigure('6 Months')).toEqual({ value: 6, annual: false })
    expect(payFigure('3 Locations')).toEqual({ value: 3, annual: false })
  })

  it('never ends a number inside a longer one', () => {
    expect(payFigure('15000INR')).toEqual({ value: 15000, annual: false })
  })

  it('gives a small low end the unit the range names after its high end', () => {
    expect(payFigure('12 - 15 L').value).toBe(1200000)
    expect(payFigure('0.8 - 1.2 Cr').value).toBe(8000000)
    expect(payFigure('10-15k').value).toBe(10000)
    expect(payFigure('12-18 LPA')).toEqual({ value: 1200000, annual: true })
  })

  // A large first figure already is the amount, whatever follows it.
  it('does not scale a figure that is already a whole amount', () => {
    expect(payFigure('15000 - 20k').value).toBe(15000)
  })

  it('says nothing for a text without a number', () => {
    expect(payFigure('Competitive')).toBeNull()
    expect(payFigure('')).toBeNull()
    expect(payFigure(null)).toBeNull()
  })
})
