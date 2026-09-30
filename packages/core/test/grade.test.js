import { describe, it, expect } from 'vitest'
import { gradeFor, GRADE_BANDS } from '@jobdekho/core/grade.js'
import { gradeFor as viaScore } from '@jobdekho/core/score.js'

describe('gradeFor', () => {
  // Floors with a meaning on the content-times-gates scale, set before
  // labelling and checked against 269 hand labels on two profiles.
  it('grades each band edge on the floors', () => {
    expect(gradeFor(90)).toBe('A')
    expect(gradeFor(55)).toBe('A')
    expect(gradeFor(54)).toBe('B')
    expect(gradeFor(40)).toBe('B')
    expect(gradeFor(39)).toBe('C')
    expect(gradeFor(25)).toBe('C')
    expect(gradeFor(24)).toBe('D')
    expect(gradeFor(12)).toBe('D')
    expect(gradeFor(11)).toBe('F')
    expect(gradeFor(0)).toBe('F')
  })

  // The web app's Fit floors and the chat's allow-list mirror these, and a
  // test on each side guards the copy.
  it('lists the floors best first', () => {
    expect(GRADE_BANDS).toEqual([['A', 55], ['B', 40], ['C', 25], ['D', 12]])
  })

  // The store reads everything score-shaped through score.js, so the grade
  // has to stay reachable from there too.
  it('stays importable beside the fit it grades', () => {
    expect(viaScore).toBe(gradeFor)
  })
})
