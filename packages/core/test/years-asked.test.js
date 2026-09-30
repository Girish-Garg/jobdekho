import { describe, it, expect } from 'vitest'
import { yearsIn, yearsAsked } from '@jobdekho/core/years-asked.js'
import { titleLevel } from '@jobdekho/core/title-level.js'

describe('yearsIn', () => {
  it('reads the ways ads ask for years', () => {
    expect(yearsIn('3-5 years of experience')).toEqual([3, 5])
    expect(yearsIn('3 to 5 years')).toEqual([3, 5])
    expect(yearsIn('5+ years building systems')).toEqual([5, 9])
    expect(yearsIn('Minimum 2 years in Java')).toEqual([2, 5])
    expect(yearsIn('2 years of professional experience')).toEqual([2, 5])
    expect(yearsIn('Experience: 4 years')).toEqual([4, 7])
  })

  // Numbers that are not a requirement used to set seniority.
  it('ignores years that are not a requirement', () => {
    expect(yearsIn('We were founded 20 years ago')).toBeNull()
    expect(yearsIn('A 4 year degree in CS')).toBeNull()
    expect(yearsIn('Build fast systems')).toBeNull()
  })
})

describe('titleLevel', () => {
  it('reads explicit seniority words', () => {
    expect(titleLevel('Senior Software Engineer').level).toBe('senior')
    expect(titleLevel('SSE - Full Stack').level).toBe('senior')
    expect(titleLevel('Staff Engineer').level).toBe('staff')
    expect(titleLevel('Full Stack Developer Intern').level).toBe('internship')
    expect(titleLevel('Associate Software Engineer').level).toBe('entry')
  })

  it('reads a rank numeral that closes the role', () => {
    expect(titleLevel('SDE 1 - Fullstack').level).toBe('entry')
    expect(titleLevel('Software Engineer II, Payments').level).toBe('mid')
    expect(titleLevel('SDE III -Backend').level).toBe('senior')
  })

  // Unlike level.js, an unmarked title is unknown here, not mid.
  it('is null for a title that says nothing about seniority', () => {
    expect(titleLevel('Full Stack Developer')).toBeNull()
    expect(titleLevel('Data Platform - Team 1')).toBeNull()
  })
})

describe('yearsAsked', () => {
  const units = (...pairs) => pairs.map(([section, text]) => ({ section, text }))

  // "Senior Engineer, 3+ years" is a three year job at a company that calls
  // it senior.
  it('prefers the years in the text over the title words', () => {
    const got = yearsAsked({ title: 'Senior Engineer', units: units(['req', '3+ years of experience']) })
    expect(got).toEqual({ band: [3, 7], from: 'years', titleLevel: 'senior' })
  })

  it('takes the highest floor among the requirement lines', () => {
    const got = yearsAsked({ title: 'Engineer', units: units(['req', '2+ years of React'], ['req', '5+ years overall']) })
    expect(got.band[0]).toBe(5)
  })

  it('never reads years out of the about-us copy', () => {
    const got = yearsAsked({ title: 'Engineer', units: units(['about', 'We have 10+ years of experience serving clients']) })
    expect(got.band).toBeNull()
  })

  it('falls back to the board field, then to the title', () => {
    expect(yearsAsked({ title: 'Developer', units: [], experienceYears: 1 })).toEqual({ band: [1, 4], from: 'board', titleLevel: null })
    expect(yearsAsked({ title: 'Staff Engineer', units: [] })).toEqual({ band: [7, 15], from: 'title', titleLevel: 'staff' })
  })

  it('is unknown when nothing says', () => {
    expect(yearsAsked({ title: 'Developer', units: [] })).toEqual({ band: null, from: null, titleLevel: null })
  })
})
