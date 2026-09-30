import { describe, it, expect } from 'vitest'
import { scorePosting, fitContext } from '@jobdekho/core/score.js'

const profile = { skills: ['react', 'node', 'postgres'], titles: ['software engineer'], years: 2, degree: 'bachelors', locations: ['pune'] }
const explain = (row) => scorePosting({ location: 'Pune', type: 'job', degreeMin: 'none', ...row }, fitContext(profile))

describe('the explanation of a fit', () => {
  it('lays out skills held, close and missing, with where the ad named each', () => {
    const { why } = explain({ title: 'Software Engineer', descriptionText: 'Requirements: - React, Next.js and Go.' })
    expect(why.has).toEqual([{ skill: 'React', where: 'req' }])
    expect(why.close).toEqual([{ skill: 'Next.js', via: 'React' }])
    expect(why.missing).toEqual([{ skill: 'Go', where: 'req' }])
  })

  it('states the years asked and the place', () => {
    const { why } = explain({ title: 'Software Engineer', descriptionText: 'Requirements: - 5+ years of experience.', location: 'Chennai' })
    expect(why.asked).toEqual({ min: 5, max: 9, from: 'years', phrase: 'at least 5 years' })
    expect(why.place).toBe('in Chennai, not a place you listed')
  })

  it('says the same in short phrases, warnings last', () => {
    const { reasons } = explain({ title: 'Software Engineer', descriptionText: 'Requirements: - React. - 5+ years of experience.', location: 'Chennai' })
    expect(reasons).toEqual([
      'has React',
      'close to a title you want',
      'asks at least 5 years, you have 2 years',
      'in Chennai, not a place you listed',
    ])
  })

  it('names the word that made it a different job', () => {
    expect(explain({ title: 'Software Test Engineer' }).reasons).toContain('a test role, not the kind you want')
  })

  it('says so when the level suits', () => {
    expect(explain({ title: 'Software Engineer II' }).reasons).toContain('suits your experience')
  })

  // An ad that never states its years is the ad's gap, not the person's.
  it('leaves an unstated level to the gate line, out of the phrases', () => {
    const { reasons, gates } = explain({ title: 'Software Engineer' })
    expect(reasons.join(' ')).not.toMatch(/experience/)
    expect(gates.find((g) => g.gate === 'level').value).toBe(0.85)
  })

  it('lists every gate with its value and phrase', () => {
    const { gates } = explain({ title: 'Software Engineer', type: 'internship' })
    expect(gates.map((g) => g.gate)).toEqual(['level', 'place', 'type', 'degree'])
    expect(gates.find((g) => g.gate === 'type')).toEqual({ gate: 'type', value: 0.3, why: 'an internship, and you have 2 years of work' })
  })
})
