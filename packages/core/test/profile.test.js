import { describe, it, expect } from 'vitest'
import { normalizeProfile, MAX_SKILLS } from '@jobdekho/core/profile.js'

describe('normalizeProfile', () => {
  it('lowercases, dedupes and drops blanks', () => {
    const p = normalizeProfile({ skills: ['React', 'react', ' Node ', ''] })
    expect(p.skills).toEqual(['react', 'node'])
  })

  it('falls back safely on junk', () => {
    expect(normalizeProfile(null)).toEqual({
      skills: [], years: null, degree: 'none', titles: [], locations: [],
    })
    expect(normalizeProfile({ years: 'abc' }).years).toBeNull()
    expect(normalizeProfile({ years: -3 }).years).toBeNull()
    expect(normalizeProfile({ degree: 'bootcamp' }).degree).toBe('none')
  })

  // GET /api/profile returns null for a year count nobody entered, and a
  // cleared form field sends "". Number() turns both into 0, which read as a
  // zero-year fresher and held back every job asking for experience. Zero
  // itself is a real answer and has to survive.
  it('keeps an unstated number of years unstated', () => {
    expect(normalizeProfile({ years: null }).years).toBeNull()
    expect(normalizeProfile({ years: undefined }).years).toBeNull()
    expect(normalizeProfile({ years: '' }).years).toBeNull()
    expect(normalizeProfile({ years: 0 }).years).toBe(0)
    expect(normalizeProfile({ years: '4' }).years).toBe(4)
  })

  // The owner asked for 40, up from 25.
  it('caps the skill and title lists at 40', () => {
    const many = Array.from({ length: 60 }, (_, i) => `skill${i}`)
    expect(MAX_SKILLS).toBe(40)
    expect(normalizeProfile({ skills: many }).skills).toHaveLength(40)
    expect(normalizeProfile({ titles: many }).titles).toHaveLength(40)
  })
})
