import { describe, it, expect } from 'vitest'
import { classifyDegree, degreeRank } from '@jobdekho/core/degree.js'

describe('classifyDegree', () => {
  it('reports no requirement when none is stated', () => {
    expect(classifyDegree('Frontend Developer', 'Build the UI')).toEqual({
      degreeMin: 'none', degreeRequired: false,
    })
  })

  it('takes the lowest degree named as the floor', () => {
    expect(classifyDegree('ML Engineer', 'BS/MS/PhD in Computer Science').degreeMin).toBe('bachelors')
    expect(classifyDegree('Research Scientist', 'MS or PhD required').degreeMin).toBe('masters')
    expect(classifyDegree('Research Scientist', 'PhD in Machine Learning').degreeMin).toBe('phd')
  })

  it('recognises Indian degree spellings', () => {
    expect(classifyDegree('SDE', 'B.Tech in CS').degreeMin).toBe('bachelors')
    expect(classifyDegree('SDE', 'M.Tech preferred').degreeMin).toBe('masters')
  })

  it('marks soft requirements as not required', () => {
    expect(classifyDegree('Scientist', 'PhD preferred').degreeRequired).toBe(false)
    expect(classifyDegree('Scientist', 'Bachelor degree or equivalent experience').degreeRequired).toBe(false)
    expect(classifyDegree('Scientist', 'PhD in Physics').degreeRequired).toBe(true)
  })

  it('does not read the word "be" as a B.E. degree', () => {
    expect(classifyDegree('Developer', 'You will be responsible for the API').degreeMin).toBe('none')
  })

  it('ranks degrees in ladder order', () => {
    expect(degreeRank('none')).toBeLessThan(degreeRank('bachelors'))
    expect(degreeRank('masters')).toBeLessThan(degreeRank('phd'))
    expect(degreeRank('nonsense')).toBe(0)
  })
})
