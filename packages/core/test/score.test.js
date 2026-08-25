import { describe, it, expect } from 'vitest'
import { normalizeProfile, levelsForYears, filterFromProfile } from '@jobdekho/core/profile.js'
import {
  scorePosting, explainScore, canRank, dimensionWeights, levelFitTable, WEIGHTS,
} from '@jobdekho/core/score.js'
import { levelFit, titleFit, titleTokens, idfWeight } from '@jobdekho/core/fit-dimensions.js'

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

  // GET /api/profile returns null for a year count nobody entered, and a
  // cleared form field sends "". Number() turns both into 0, which read as a
  // zero-year fresher and put "well outside your experience" on every senior
  // posting. Zero itself is a real answer and has to survive.
  it('keeps an unstated number of years unstated', () => {
    expect(normalizeProfile({ years: null }).years).toBeNull()
    expect(normalizeProfile({ years: undefined }).years).toBeNull()
    expect(normalizeProfile({ years: '' }).years).toBeNull()
    expect(normalizeProfile({ years: 0 }).years).toBe(0)
    expect(normalizeProfile({ years: '4' }).years).toBe(4)
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

  it('rules nothing out when experience is unknown', () => {
    expect(levelsForYears(null)).toEqual([])
    expect(levelsForYears(undefined)).toEqual([])
  })
})

describe('scorePosting', () => {
  it('weighs a title match far above a body mention', () => {
    const titled = scorePosting(posting({ title: 'React Developer' }), profile)
    const bodied = scorePosting(posting({ descriptionText: 'we use react here' }), profile)
    expect(titled.fit).toBeGreaterThan(bodied.fit)
    expect(titled.matched).toEqual(['react'])
    expect(bodied.mentioned).toEqual(['react'])
  })

  it('does not double count a skill in both title and body', () => {
    const s = scorePosting(posting({ title: 'React Dev', descriptionText: 'react react' }), profile)
    expect(s.matched).toEqual(['react'])
    expect(s.mentioned).toEqual([])
  })

  // The score is a percentage now, so it has to stay inside its range whatever
  // the profile says. An unbounded tally is what cost the old ranking its
  // resolution: 1485 real postings landed on 22 distinct values.
  it('stays within 0 and 100', () => {
    const best = scorePosting(posting({ title: 'React Node Python Developer', level: 'entry' }), profile)
    const worst = scorePosting(posting({ title: 'Chief Executive', level: 'executive', degreeMin: 'phd' }), profile)
    expect(best.fit).toBeLessThanOrEqual(100)
    expect(worst.fit).toBeGreaterThanOrEqual(0)
    expect(best.fit).toBeGreaterThan(worst.fit)
  })

  // This asserted the opposite until live data showed the opposite was wrong.
  // Dividing by every listed skill asked whether the job used everything the
  // candidate knew, so a real 25 skill profile scored 4.3 of 45 on its own
  // best internship and nothing could clear 60. Breadth is not evidence
  // against a match, and listing one more skill must not devalue every job.
  it('does not dilute a match when the profile lists more skills', () => {
    const focused = scorePosting(posting({ title: 'React Developer' }), { skills: ['react'], years: 2 })
    const broad = scorePosting(posting({ title: 'React Developer' }), {
      skills: ['react', 'go', 'rust', 'scala', 'kotlin', 'swift', 'elixir'], years: 2,
    })
    expect(broad.fit).toBe(focused.fit)
  })

  // What should separate two postings is how much each matched, which is the
  // question the ranking exists to answer.
  it('ranks a posting that matches more above one that matches less', () => {
    const p = { skills: ['react', 'node', 'python', 'docker'], years: 2 }
    const many = scorePosting(posting({ title: 'React Node Python Developer' }), p)
    const few = scorePosting(posting({ title: 'React Developer' }), p)
    expect(many.fit).toBeGreaterThan(few.fit)
  })

  // A rare skill is evidence about the role; one that appears in a third of
  // the corpus barely narrows anything, so the two must not count the same.
  it('lets rarity weight a skill', () => {
    const p = { skills: ['python', 'kubernetes'], years: 2 }
    const idf = { python: 1, kubernetes: 4 }
    const rare = scorePosting(posting({ title: 'Kubernetes Engineer' }), p, idf)
    const common = scorePosting(posting({ title: 'Python Engineer' }), p, idf)
    expect(rare.fit).toBeGreaterThan(common.fit)
  })

  // Target titles were collected, stored and then ignored by the ranking,
  // which threw away the most direct statement of what the user wants.
  it('scores the target titles the profile lists', () => {
    const p = { titles: ['frontend developer'], years: 2 }
    const near = scorePosting(posting({ title: 'Frontend Developer' }), p)
    const far = scorePosting(posting({ title: 'Warehouse Operative' }), p)
    expect(near.titleFit).toBe(1)
    expect(far.titleFit).toBe(0)
    expect(near.fit).toBeGreaterThan(far.fit)
  })

  it('rewards a level that suits the experience', () => {
    expect(scorePosting(posting({ level: 'entry' }), profile).levelFit).toBe(1)
    expect(scorePosting(posting({ level: 'executive' }), profile).levelFit).toBe(0)
  })

  // The bug the level curve exists for: two skill matches on a Lead role used
  // to beat one match on a well-suited entry role, and the feed recommended
  // jobs a one-year candidate cannot get.
  it('ranks a suited role above a mismatched one that matches more skills', () => {
    const suited = scorePosting(posting({ title: 'React Developer', level: 'entry' }), profile)
    const overreach = scorePosting(posting({ title: 'Node Python Architect', level: 'executive' }), profile)
    expect(overreach.matched.length).toBeGreaterThan(suited.matched.length)
    expect(suited.fit).toBeGreaterThan(overreach.fit)
  })

  it('rewards a degree the seeker can actually reach', () => {
    expect(scorePosting(posting({ degreeMin: 'bachelors' }), profile).reachable).toBe(true)
    expect(scorePosting(posting({ degreeMin: 'phd' }), profile).reachable).toBe(false)
  })

  it('scores an empty profile without crashing', () => {
    expect(scorePosting(posting(), {}).fit).toBe(100)
  })

  // Substring matching let the skill "c" score every posting that contained
  // the letter, and "java" claim JavaScript roles.
  it('matches skills at word boundaries only', () => {
    const s = scorePosting(posting({ title: 'Product Manager' }), { skills: ['c', 'r', 'go'] })
    expect(s.matched).toEqual([])
    expect(s.mentioned).toEqual([])
    expect(scorePosting(posting({ title: 'JavaScript Developer' }), { skills: ['java'] }).matched).toEqual([])
    expect(scorePosting(posting({ title: 'Java Developer' }), { skills: ['java'] }).matched).toEqual(['java'])
  })

  // Skills legitimately carry regex metacharacters, and their symbol edges
  // must not demand a word boundary that cannot exist there.
  it('matches skills that contain symbols', () => {
    expect(scorePosting(posting({ title: 'C++ Developer' }), { skills: ['c++'] }).matched).toEqual(['c++'])
    expect(scorePosting(posting({ title: 'ASP.NET Engineer' }), { skills: ['.net'] }).matched).toEqual(['.net'])
    expect(scorePosting(posting({ title: 'Node.js Developer' }), { skills: ['node.js'] }).matched).toEqual(['node.js'])
  })

  // The body used to be a 280 character snippet, which is why only 3% of real
  // postings matched a skill at all. The scorer reads the longer text when it
  // is there and still works from the snippet when it is not.
  it('prefers the full text over the snippet', () => {
    const both = posting({ descriptionText: 'we use python daily', descriptionSnippet: 'nothing here' })
    expect(scorePosting(both, profile).mentioned).toEqual(['python'])
  })
})

describe('scorePosting breakdown', () => {
  // A display read `weight` as the dimension's ceiling in points and printed
  // "32 of 4500". The ceiling is `max`, which is the weight renormalised over
  // only the dimensions the profile supports, so it moves with the profile
  // while the raw weight does not. The two must never be confused again.
  it('carries a ceiling in points that is not the raw weight', () => {
    const full = scorePosting(posting(), { skills: ['react'], titles: ['dev'], years: 2 })
    const skills = full.breakdown.find((d) => d.dimension === 'skills')
    expect(skills.weight).toBe(WEIGHTS.skills)
    expect(skills.max).toBe(WEIGHTS.skills)

    // Dropping the titles dimension renormalises the rest upward.
    const partial = scorePosting(posting(), { skills: ['react'], years: 2 })
    const widened = partial.breakdown.find((d) => d.dimension === 'skills')
    expect(widened.weight).toBe(WEIGHTS.skills)
    expect(widened.max).toBeGreaterThan(WEIGHTS.skills)
  })

  it('never reports points above the dimension ceiling', () => {
    const { breakdown } = scorePosting(posting({ title: 'React Node Python Developer' }), profile)
    for (const d of breakdown) expect(d.points).toBeLessThanOrEqual(d.max + 1e-9)
  })

  it('sums every ceiling to one hundred', () => {
    for (const p of [profile, { skills: ['react'] }, { titles: ['dev'], years: 3 }]) {
      const { breakdown } = scorePosting(posting(), p)
      expect(Math.round(breakdown.reduce((sum, d) => sum + d.max, 0))).toBe(100)
    }
  })

  // The breakdown exists so a UI can show why a grade landed where it did,
  // which only works if the parts genuinely are the whole.
  it('adds up to the fit it explains', () => {
    const { fit, breakdown } = scorePosting(posting({ title: 'React Developer' }), profile)
    expect(Math.round(breakdown.reduce((sum, d) => sum + d.points, 0))).toBe(fit)
  })

  it('still adds up under rarity weights and a partial profile', () => {
    const p = { skills: ['python', 'kubernetes'], years: 2 }
    const idf = { python: 1, kubernetes: 4 }
    const { fit, breakdown } = scorePosting(posting({ descriptionText: 'python daily' }), p, idf)
    expect(Math.round(breakdown.reduce((sum, d) => sum + d.points, 0))).toBe(fit)
  })

  it('reports each dimension as its 0-1 value, weight and points', () => {
    const { breakdown } = scorePosting(posting({ title: 'React Developer' }), profile)
    const { total } = dimensionWeights(profile)
    for (const d of breakdown) {
      expect(d.value).toBeGreaterThanOrEqual(0)
      expect(d.value).toBeLessThanOrEqual(1)
      expect(d.weight).toBe(WEIGHTS[d.dimension])
      expect(d.points).toBeCloseTo((100 * d.weight * d.value) / total, 10)
    }
  })

  // A dropped dimension shown at zero would read as a failed match, when the
  // truth is that the profile asked nothing of it.
  it('leaves an unasked dimension out instead of showing it at zero', () => {
    const { breakdown } = scorePosting(posting(), { skills: ['react'], years: 2 })
    expect(breakdown.map((d) => d.dimension)).toEqual(['skills', 'level', 'degree'])
  })
})

describe('dimensionWeights', () => {
  // Scoring an absent dimension as zero would cap an incomplete profile below
  // 100 forever, which reads as a bad match rather than as a thin profile.
  it('drops a dimension the profile says nothing about', () => {
    const w = dimensionWeights({ skills: ['react'], years: 2 })
    expect(w.titles).toBe(0)
    expect(w.total).toBe(WEIGHTS.skills + WEIGHTS.level + WEIGHTS.degree)
  })

  it('counts every dimension a full profile supports', () => {
    const w = dimensionWeights({ skills: ['react'], titles: ['dev'], years: 2, degree: 'bachelors' })
    expect(w.total).toBe(WEIGHTS.skills + WEIGHTS.titles + WEIGHTS.level + WEIGHTS.degree)
  })
})

describe('levelFit', () => {
  const wanted = ['entry', 'mid']

  it('pays in full for a hit and falls away with distance', () => {
    expect(levelFit('entry', wanted)).toBe(1)
    expect(levelFit('senior', wanted)).toBeLessThan(1)
    expect(levelFit('executive', wanted)).toBe(0)
  })

  // An unstated number of years should not push anything down the list.
  it('is neutral when the resume gave no experience', () => {
    expect(levelFit('executive', [])).toBe(0)
  })

  it('tabulates every rung so SQL can look it up', () => {
    const table = levelFitTable(wanted)
    expect(Object.keys(table)).toHaveLength(6)
    expect(table.mid).toBe(1)
    expect(table.executive).toBe(0)
  })
})

describe('titleFit', () => {
  // Several target titles are alternatives, so the best one is the answer:
  // being a perfect fit for one is not made worse by naming two others.
  it('takes the best of several target titles', () => {
    expect(titleFit('Frontend Engineer', ['data scientist', 'frontend engineer'])).toBe(1)
  })

  it('scores a partial overlap in proportion', () => {
    expect(titleFit('Frontend Engineer', ['frontend developer'])).toBe(0.5)
  })

  // Level is scored separately, so leaving a seniority word in would let one
  // signal count twice.
  it('ignores seniority words and rank numerals', () => {
    expect(titleTokens('Senior Staff Frontend Engineer II')).toEqual(['frontend', 'engineer'])
  })

  it('is zero when the profile names no title', () => {
    expect(titleFit('Frontend Engineer', [])).toBe(0)
  })
})

describe('idfWeight', () => {
  it('pays more for a skill that appears in fewer postings', () => {
    expect(idfWeight(50, 1000)).toBeGreaterThan(idfWeight(500, 1000))
  })

  // Without a floor, a skill in every posting would be free to match, and a
  // corpus nobody has measured yet would zero the whole dimension.
  it('never drops below one', () => {
    expect(idfWeight(1000, 1000)).toBeGreaterThanOrEqual(1)
    expect(idfWeight(0, 0)).toBe(1)
  })
})

describe('canRank', () => {
  it('refuses a profile with nothing to rank against', () => {
    expect(canRank({ skills: [], titles: [], years: null })).toBe(false)
    expect(canRank(null)).toBe(false)
  })

  // Titles alone are worth ranking on: someone who named a target job but no
  // skills has still said what they want.
  it('accepts skills, years or titles alone', () => {
    expect(canRank({ skills: ['react'] })).toBe(true)
    expect(canRank({ years: 0 })).toBe(true)
    expect(canRank({ titles: ['frontend developer'] })).toBe(true)
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

  it('names a title the profile was aiming at', () => {
    const { reasons } = explainScore(posting({ title: 'Frontend Developer' }), {
      titles: ['frontend developer'], years: 2,
    })
    expect(reasons.join(' ')).toContain('title')
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
