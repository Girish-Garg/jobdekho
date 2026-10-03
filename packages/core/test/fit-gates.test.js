import { describe, it, expect } from 'vitest'
import { fitGates, gateProduct } from '@jobdekho/core/fit-gates.js'
import { fitContext } from '@jobdekho/core/fit-context.js'

const ctx = fitContext({ skills: ['react'], years: 2, degree: 'bachelors', locations: ['pune'] })
const features = { band: [1, 4], from: 'years', titleLevel: null }
const row = (over) => ({ location: 'Pune', workMode: 'onsite', type: 'job', degreeMin: 'none', ...over })

describe('fitGates', () => {
  it('holds nothing back for a job the person can take', () => {
    const gates = fitGates(row(), features, ctx)
    expect(gateProduct(gates)).toBe(1)
  })

  it('holds back an internship for someone with work behind them, once', () => {
    const gates = fitGates(row({ type: 'internship' }), { band: [0, 0], from: 'title', titleLevel: 'internship' }, ctx)
    expect(gates.type).toEqual({ value: 0.3, why: 'an internship, and you have 2 years of work' })
    // The internship's zero-year band must not cost it a second time.
    expect(gates.level).toEqual({ value: 1, why: null })
  })

  // A posting that states no level is not mid and not an internship: no
  // gate may close on it.
  it('never gates on an unknown level or type', () => {
    const unknown = fitGates(row({ type: 'job', level: null }), { band: null, from: null, titleLevel: null }, fitContext({ years: 6 }))
    expect(unknown.type).toEqual({ value: 1, why: null })
    expect(unknown.level.value).toBe(0.85)
    expect(fitGates(row({ type: undefined, level: undefined }), features, ctx).type.value).toBe(1)
  })

  it('keeps internships open to someone with no work yet', () => {
    const fresher = fitContext({ years: 0 })
    expect(fitGates(row({ type: 'internship' }), features, fresher).type.value).toBe(1)
  })

  it('costs a degree the ad needs more than one it only prefers', () => {
    const needs = fitGates(row({ degreeMin: 'masters', degreeRequired: true }), features, ctx)
    const prefers = fitGates(row({ degreeMin: 'masters', degreeRequired: false }), features, ctx)
    expect(needs.degree).toEqual({ value: 0.5, why: "needs a master's degree" })
    expect(prefers.degree.value).toBe(0.85)
  })

  it('reads the place and the years asked', () => {
    const gates = fitGates(row({ location: 'Chennai' }), { band: [5, 9], from: 'years', titleLevel: null }, ctx)
    expect(gates.place.value).toBe(0.6)
    expect(gates.level.value).toBe(0.3)
    expect(gateProduct(gates)).toBeCloseTo(0.18)
  })
})
