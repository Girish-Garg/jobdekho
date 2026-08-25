import { describe, it, expect } from 'vitest'
import { gradeFor, GRADE_BANDS } from '@jobdekho/core/grade.js'
import { gradeFor as viaScore } from '@jobdekho/core/score.js'

describe('gradeFor', () => {
  // The bands are calibrated to the measured corpus, where fit tops out in
  // the low sixties. Schoolroom 90/80/70/60 would grade every posting F.
  it('grades each band edge on the calibrated floors, not schoolroom ones', () => {
    expect(gradeFor(63)).toBe('A')
    expect(gradeFor(45)).toBe('A')
    expect(gradeFor(44)).toBe('B')
    expect(gradeFor(35)).toBe('B')
    expect(gradeFor(34)).toBe('C')
    expect(gradeFor(25)).toBe('C')
    expect(gradeFor(24)).toBe('D')
    expect(gradeFor(15)).toBe('D')
    expect(gradeFor(14)).toBe('F')
    expect(gradeFor(0)).toBe('F')
  })

  // The web app already calls 45 "Strong fit"; an A that disagreed with that
  // chip would put two contradictory judgements on the same card.
  it('keeps the A floor on the UI Strong fit threshold', () => {
    expect(GRADE_BANDS[0]).toEqual(['A', 45])
  })

  // The query layer imports everything score-shaped through score.js, so the
  // grade has to stay reachable from there too.
  it('stays importable beside the fit it grades', () => {
    expect(viaScore).toBe(gradeFor)
  })
})
