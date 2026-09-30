import { describe, it, expect } from 'vitest'
import { titleMatch, titleWords, wantedTitles } from '@jobdekho/core/title-match.js'

const want = wantedTitles(['software engineer', 'full stack developer'])
const value = (title, w = want) => titleMatch(title, w).value

describe('titleWords', () => {
  // SDE, fullstack and developer are the same words said differently.
  it('folds the spellings job titles use', () => {
    expect(titleWords('SDE 1 - Fullstack')).toEqual(['software', 'engineer', 'fullstack'])
    expect(titleWords('Full-Stack Developer')).toEqual(['fullstack', 'engineer'])
    expect(titleWords('MERN Stack Developer')).toEqual(['fullstack', 'engineer'])
  })

  // Seniority is the level gate's job, so it would count twice here.
  it('drops seniority and rank words', () => {
    expect(titleWords('Senior Staff Frontend Engineer II')).toEqual(['frontend', 'engineer'])
  })
})

describe('titleMatch', () => {
  it('is full for the title wanted, however it is spelled', () => {
    expect(value('Software Development Engineer')).toBe(1)
    expect(value('SDE 1 - Fullstack')).toBe(1)
  })

  it('takes the best of several wanted titles', () => {
    expect(value('Full Stack Developer')).toBe(1)
  })

  it('gives part credit to a role in the same family', () => {
    expect(value('Frontend Engineer')).toBeCloseTo(0.85)
    expect(value('Backend Developer')).toBeCloseTo(0.85)
  })

  // "Software Test Engineer" holds every word of "software engineer".
  it('costs a word that makes it another job, and says which', () => {
    expect(titleMatch('Software Test Engineer', want)).toEqual({ value: 0.35, changedBy: 'test' })
    expect(value('Software Engineer (Data Analyst)')).toBeCloseTo(0.35)
    expect(value('Engineering Manager')).toBeLessThan(0.35)
  })

  it('does not cost a word the wanted title itself holds', () => {
    expect(value('Data Analyst', wantedTitles(['data analyst']))).toBe(1)
  })

  it('leaves a team name alone', () => {
    expect(value('Software Engineer - Auth')).toBe(1)
  })

  it('is zero for a title with nothing in common', () => {
    expect(titleMatch('Warehouse Operative', want)).toEqual({ value: 0, changedBy: null })
  })
})
