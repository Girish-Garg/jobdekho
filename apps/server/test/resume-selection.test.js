import { describe, it, expect } from 'vitest'
import { applySelection } from '@jobdekho/server/resume/selection.js'

const profile = {
  basics: { name: 'Jane Doe' },
  experience: [
    { id: 'e1', title: 'A' }, { id: 'e2', title: 'B' }, { id: 'e3', title: 'C' },
  ],
  projects: [{ id: 'p1', title: 'Only project' }],
  education: [], certifications: [], achievements: [],
  skillGroups: [{ id: 'g1', name: 'Languages' }],
}

describe('applySelection', () => {
  it('keeps everything in profile order when a section is not mentioned', () => {
    const picked = applySelection(profile, {})
    expect(picked.experience.map((e) => e.id)).toEqual(['e1', 'e2', 'e3'])
    expect(picked.projects.map((e) => e.id)).toEqual(['p1'])
  })

  it('reorders to the ids given, dropping anything not listed', () => {
    const picked = applySelection(profile, { experience: ['e3', 'e1'] })
    expect(picked.experience.map((e) => e.id)).toEqual(['e3', 'e1'])
  })

  it('empties a section explicitly given as []', () => {
    const picked = applySelection(profile, { experience: [] })
    expect(picked.experience).toEqual([])
  })

  it('silently drops an id the profile no longer has', () => {
    const picked = applySelection(profile, { experience: ['e1', 'gone', 'e2'] })
    expect(picked.experience.map((e) => e.id)).toEqual(['e1', 'e2'])
  })

  it('applies the same rule to skill groups', () => {
    expect(applySelection(profile, {}).skillGroups.map((g) => g.id)).toEqual(['g1'])
    expect(applySelection(profile, { skillGroups: [] }).skillGroups).toEqual([])
  })

  it('carries basics through untouched', () => {
    expect(applySelection(profile, {}).basics).toEqual({ name: 'Jane Doe' })
  })

  it('tolerates a profile with missing section arrays', () => {
    expect(() => applySelection({ basics: {} }, {})).not.toThrow()
  })
})
