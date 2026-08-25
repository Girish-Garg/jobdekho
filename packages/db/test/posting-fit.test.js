import { describe, it, expect } from 'vitest'
import { gradeFor } from '@jobdekho/core/score.js'
import { withFit, withGhost } from '@jobdekho/db/posting-fit.js'

// Enough to read as a real, fresh, well-described posting: ghostSignals()
// should find nothing to say about it beyond what a test deliberately breaks.
const row = {
  id: '1', title: 'React Developer', level: 'entry', degreeMin: 'none', tags: [],
  stipend: 'INR 20,000/month', postedAt: '2026-08-01',
  descriptionSnippet: 'short',
  descriptionText: 'We are hiring a react developer to build services with node and postgresql for our growing team. '.repeat(12),
  groupCount: 1, groupSourceCount: 1,
}

describe('withGhost', () => {
  it('adds legitimacy and ghostSignals without a profile', () => {
    const posting = withGhost(row)
    expect(posting.legitimacy).toBe('high')
    expect(posting.ghostSignals).toEqual([])
  })

  it('strips descriptionText', () => {
    expect('descriptionText' in withGhost(row)).toBe(false)
  })

  // One role advertised in six cities is six postings from ONE board, not a
  // blast - groupCount alone cannot tell them apart, which is why
  // groupSourceCount exists.
  it('does not flag a high groupCount from a single source as a blast', () => {
    const posting = withGhost({ ...row, groupCount: 9, groupSourceCount: 1 })
    expect(posting.ghostSignals).toEqual([])
  })

  it('flags the same role once it is genuinely listed across several boards', () => {
    const posting = withGhost({ ...row, groupSourceCount: 6 })
    expect(posting.ghostSignals).toContain('listed on 6 job boards')
  })
})

describe('withFit', () => {
  const profile = { skills: ['react'], years: 0 }

  it('carries fit, reasons, grade, breakdown, legitimacy and ghostSignals together', () => {
    const posting = withFit(row, profile, {})
    // Not 100: the skills curve saturates, so a single matched skill is
    // strong evidence rather than complete evidence.
    expect(posting.fit).toBe(47)
    expect(posting.reasons).toContain('matches react')
    expect(posting.grade).toBe(gradeFor(posting.fit))
    expect(posting.breakdown.length).toBeGreaterThan(0)
    expect(posting.legitimacy).toBe('high')
    expect(posting.ghostSignals).toEqual([])
  })

  it('strips descriptionText', () => {
    expect('descriptionText' in withFit(row, profile, {})).toBe(false)
  })
})
