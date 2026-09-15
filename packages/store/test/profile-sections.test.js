import { describe, it, expect } from 'vitest'
import { normalizeSections, ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'

const EMPTY_BASICS = { name: '', headline: '', email: '', phone: '', location: '', links: { github: '', linkedin: '', portfolio: '' } }

describe('normalizeSections', () => {
  it('defaults every section for a wholly new profile', () => {
    const sections = normalizeSections({})
    expect(sections.basics).toEqual(EMPTY_BASICS)
    for (const key of ENTRY_SECTIONS) expect(sections[key]).toEqual([])
    expect(sections.skillGroups).toEqual([])
  })

  it('normalizes basics, trimming text and filling the named links', () => {
    const sections = normalizeSections({ basics: { name: ' Jane Doe ', links: { github: 'github.com/jane' } } })
    expect(sections.basics).toEqual({
      name: 'Jane Doe', headline: '', email: '', phone: '', location: '',
      links: { github: 'github.com/jane', linkedin: '', portfolio: '' },
    })
  })

  it('normalizes every entry section present in the input', () => {
    const sections = normalizeSections({ experience: [{ title: 'Engineer' }], projects: [{ title: 'App' }] })
    expect(sections.experience).toMatchObject([{ title: 'Engineer', order: 0 }])
    expect(sections.projects).toMatchObject([{ title: 'App', order: 0 }])
    expect(sections.education).toEqual([])
  })

  // The whole point: a caller that only ever carries the flat ranking fields
  // (a hand edit to Skills, a re-extraction) must not wipe a section it never
  // mentioned. Losing a hundred hand-typed bullet lines is a far worse bug
  // than a stale tag list, so sections behave like the resume text, not like
  // the flat fields, which do get replaced wholesale on every save.
  it('carries a section forward from current when the input omits it entirely', () => {
    const current = normalizeSections({
      experience: [{ title: 'Engineer' }],
      skillGroups: [{ name: 'Languages', items: ['python'] }],
      basics: { name: 'Jane Doe' },
    })
    const sections = normalizeSections({ skills: ['react'] }, current)
    expect(sections.experience).toEqual(current.experience)
    expect(sections.skillGroups).toEqual(current.skillGroups)
    expect(sections.basics).toEqual(current.basics)
  })

  it('replaces a section the input does carry, even with an explicit empty list', () => {
    const current = normalizeSections({ experience: [{ title: 'Engineer' }] })
    const sections = normalizeSections({ experience: [] }, current)
    expect(sections.experience).toEqual([])
  })

  it('replaces rather than merges when the input does carry the section', () => {
    const current = normalizeSections({ experience: [{ title: 'Old role' }] })
    const sections = normalizeSections({ experience: [{ title: 'New role' }] }, current)
    expect(sections.experience).toMatchObject([{ title: 'New role' }])
  })
})
