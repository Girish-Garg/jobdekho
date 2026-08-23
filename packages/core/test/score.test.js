import { describe, it, expect } from 'vitest'
import { normalizeProfile, levelsForYears, filterFromProfile } from '@jobdekho/core/profile.js'
import { scorePosting, explainScore, levelScore, levelScoreTable, WEIGHTS } from '@jobdekho/core/score.js'

const profile = { skills: ['React', 'Node', 'Python'], years: 2, degree: 'bachelors' }
const posting = (over) => ({
  title: 'Backend Developer', descriptionSnippet: 'build services',
  level: 'entry', degreeMin: 'none', ...over,
})

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

  // A long SQL statement is the cost of an unbounded skill list.
  it('caps the skill list', () => {
    const many = Array.from({ length: 60 }, (_, i) => `skill${i}`)
    expect(normalizeProfile({ skills: many }).skills).toHaveLength(25)
  })
})

describe('levelsForYears', () => {
  it('spans one rung either side of the experience', () => {
    expect(levelsForYears(0)).toEqual(['internship', 'entry'])
    expect(levelsForYears(2)).toEqual(['entry', 'mid'])
    expect(levelsForYears(4)).toEqual(['mid', 'senior'])
    expect(levelsForYears(12)).toEqual(['staff', 'executive'])
  })

  // An unstated number should not narrow anything.
  it('rules nothing out when experience is unknown', () => {
    expect(levelsForYears(null)).toEqual([])
  })
})

describe('scorePosting', () => {
  it('weighs a title match far above a body mention', () => {
    const titled = scorePosting(posting({ title: 'React Developer' }), profile)
    const bodied = scorePosting(posting({ descriptionSnippet: 'we use react here' }), profile)
    expect(titled.score).toBeGreaterThan(bodied.score)
    expect(titled.matched).toEqual(['react'])
    expect(bodied.mentioned).toEqual(['react'])
  })

  it('does not double count a skill in both title and body', () => {
    const s = scorePosting(posting({ title: 'React Dev', descriptionSnippet: 'react react' }), profile)
    expect(s.matched).toEqual(['react'])
    expect(s.mentioned).toEqual([])
  })

  it('rewards a level that suits the experience', () => {
    expect(scorePosting(posting({ level: 'entry' }), profile).levelFit).toBe(true)
    expect(scorePosting(posting({ level: 'executive' }), profile).levelFit).toBe(false)
  })

  // The bug this penalty exists for: with a bonus alone, two skill matches on a
  // Lead role beat one match on a well-suited entry role, and the feed
  // recommended jobs a one-year candidate cannot get.
  it('ranks a suited role above a mismatched one that matches more skills', () => {
    const suited = scorePosting(posting({ title: 'React Developer', level: 'entry' }), profile)
    const overreach = scorePosting(posting({ title: 'Lead React Node Architect', level: 'executive' }), profile)
    expect(overreach.matched.length).toBeGreaterThan(suited.matched.length)
    expect(suited.score).toBeGreaterThan(overreach.score)
  })

  it('rewards a degree the seeker can actually reach', () => {
    expect(scorePosting(posting({ degreeMin: 'bachelors' }), profile).reachable).toBe(true)
    expect(scorePosting(posting({ degreeMin: 'phd' }), profile).reachable).toBe(false)
  })

  it('scores an empty profile at zero rather than crashing', () => {
    expect(scorePosting(posting(), {}).score).toBe(WEIGHTS.degreeFit)
  })
})

describe('levelScore', () => {
  const wanted = ['entry', 'mid']

  it('pays for a hit and charges more the further off it is', () => {
    expect(levelScore('entry', wanted)).toBe(WEIGHTS.levelFit)
    expect(levelScore('senior', wanted)).toBe(WEIGHTS.levelGap)
    expect(levelScore('executive', wanted)).toBe(WEIGHTS.levelGap * 3)
  })

  // An unstated number of years should not push anything down the list.
  it('is neutral when the resume gave no experience', () => {
    expect(levelScore('executive', [])).toBe(0)
  })

  it('tabulates every rung so SQL can look it up', () => {
    const table = levelScoreTable(wanted)
    expect(Object.keys(table)).toHaveLength(6)
    expect(table.mid).toBe(WEIGHTS.levelFit)
    expect(table.staff).toBeLessThan(0)
  })

})

describe('explainScore', () => {
  it('says why in words, not just a number', () => {
    const { reasons } = explainScore(posting({ title: 'React Developer' }), profile)
    expect(reasons.join(' ')).toContain('react')
    expect(reasons.join(' ')).toContain('suits your experience')
  })

  it('calls out a degree the seeker cannot reach', () => {
    const { reasons } = explainScore(posting({ degreeMin: 'phd' }), profile)
    expect(reasons.join(' ')).toContain('higher degree')
  })
})

describe('filterFromProfile', () => {
  it('turns a profile into the notification filter it implies', () => {
    expect(filterFromProfile({ ...profile, titles: ['Backend Developer'], locations: ['Pune'] })).toEqual({
      includeKeywords: ['react', 'node', 'python', 'backend developer'],
      levels: ['entry', 'mid'],
      maxDegree: 'bachelors',
      locations: ['pune'],
    })
  })

  it('leaves the degree ceiling open when none was found', () => {
    expect(filterFromProfile({ skills: ['go'] }).maxDegree).toBeNull()
  })
})
