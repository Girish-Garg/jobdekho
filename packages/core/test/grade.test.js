import { describe, it, expect } from 'vitest'
import { gradeFor, GRADE_BANDS } from '@jobdekho/core/grade.js'
import { gradeFor as viaScore } from '@jobdekho/core/score.js'

describe('gradeFor', () => {
  // Percentiles of the measured corpus, not schoolroom 90/80/70/60, which
  // would grade every posting F: the best of 1880 live postings scored 84.
  it('grades each band edge on the calibrated floors, not schoolroom ones', () => {
    expect(gradeFor(84)).toBe('A')
    expect(gradeFor(62)).toBe('A')
    expect(gradeFor(61)).toBe('B')
    expect(gradeFor(50)).toBe('B')
    expect(gradeFor(49)).toBe('C')
    expect(gradeFor(38)).toBe('C')
    expect(gradeFor(37)).toBe('D')
    expect(gradeFor(25)).toBe('D')
    expect(gradeFor(24)).toBe('F')
    expect(gradeFor(0)).toBe('F')
  })

  // The web app calls the same floor "Strong fit"; an A that disagreed with
  // that chip would put two contradictory judgements on one card.
  it('keeps the A floor on the UI Strong fit threshold', () => {
    expect(GRADE_BANDS[0]).toEqual(['A', 62])
  })

  // The query layer imports everything score-shaped through score.js, so the
  // grade has to stay reachable from there too.
  it('stays importable beside the fit it grades', () => {
    expect(viaScore).toBe(gradeFor)
  })
})
