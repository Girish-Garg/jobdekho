import { describe, it, expect } from 'vitest'
import { scorePosting, fitContext, canRank, CONTENT_WEIGHTS } from '@jobdekho/core/score.js'
import { FEATURES_VERSION } from '@jobdekho/core/posting-features.js'

const profile = { skills: ['React', 'Node', 'Python'], years: 2, degree: 'bachelors' }
const posting = (over) => ({
  title: 'Backend Developer', descriptionSnippet: 'build services', location: '', type: 'job', degreeMin: 'none', ...over,
})
const score = (row, p = profile, rarity) => scorePosting(posting(row), fitContext(p, rarity))

describe('scorePosting', () => {
  it('weighs a skill the title names above one the requirements name', () => {
    const titled = score({ title: 'React Developer' })
    const listed = score({ title: 'Developer', descriptionText: 'Requirements: - React.' })
    expect(titled.fit).toBeGreaterThan(listed.fit)
  })

  // The score is a percentage, so it has to stay inside its range whatever
  // the profile says.
  it('stays within 0 and 100', () => {
    const best = score({ title: 'React Node Python Developer', descriptionText: 'Requirements: - 1+ years of experience.' })
    const worst = score({ title: 'Chief Executive Officer', degreeMin: 'phd', degreeRequired: true })
    expect(best.fit).toBeLessThanOrEqual(100)
    expect(worst.fit).toBeGreaterThanOrEqual(0)
    expect(best.fit).toBeGreaterThan(worst.fit)
  })

  // Breadth is not evidence against a match, and learning one more skill
  // must not devalue every job (the old scorer divided by the profile).
  it('does not dilute a match when the profile lists more skills', () => {
    const focused = score({ title: 'React Developer' }, { skills: ['react'], years: 2 })
    const broad = score({ title: 'React Developer' }, { skills: ['react', 'go', 'rust', 'scala', 'kotlin', 'swift'], years: 2 })
    expect(broad.fit).toBe(focused.fit)
  })

  it('ranks a posting that matches more above one that matches less', () => {
    const p = { skills: ['react', 'node', 'python', 'docker'], years: 2 }
    expect(score({ title: 'React Node Python Developer' }, p).fit).toBeGreaterThan(score({ title: 'React Developer' }, p).fit)
  })

  it('lets rarity weigh a skill', () => {
    const p = { skills: ['python', 'kubernetes'], years: 2 }
    const rarity = (id) => ({ python: 0.5, kubernetes: 2 })[id] ?? 1
    expect(score({ title: 'Kubernetes Engineer' }, p, rarity).fit).toBeGreaterThan(score({ title: 'Python Engineer' }, p, rarity).fit)
  })

  it('reads the spellings a person types and the ones an ad uses as one skill', () => {
    const got = score({ title: 'Developer', descriptionText: 'Requirements: - ReactJS and PostgreSQL.' }, { skills: ['react', 'postgres'] })
    expect(got.why.has.map((h) => h.skill)).toEqual(['React', 'PostgreSQL'])
  })

  it('scores the target titles the profile lists', () => {
    const p = { titles: ['frontend developer'], years: 2 }
    expect(score({ title: 'Frontend Developer' }, p).fit).toBeGreaterThan(score({ title: 'Warehouse Operative' }, p).fit)
  })

  // The bug the level gate exists for: a Lead role matching more skills beat
  // a well-suited entry role, and the feed recommended jobs a two-year
  // candidate cannot get.
  it('ranks a suited role above a mismatched one that matches more skills', () => {
    const suited = score({ title: 'React Developer', descriptionText: 'Requirements: - 1-2 years of experience.' })
    const overreach = score({ title: 'Staff React Node Python Architect' })
    expect(suited.fit).toBeGreaterThan(overreach.fit)
  })

  it('holds back a job in a place the person did not ask for', () => {
    const p = { ...profile, locations: ['pune'] }
    expect(score({ title: 'React Developer', location: 'Pune' }, p).fit)
      .toBeGreaterThan(score({ title: 'React Developer', location: 'Chennai' }, p).fit)
  })

  it('holds back an internship for someone with two years of work', () => {
    expect(score({ title: 'React Developer' }).fit).toBeGreaterThan(score({ title: 'React Developer', type: 'internship' }).fit)
  })

  it('holds back a degree the person does not have', () => {
    expect(score({ title: 'React Developer' }).fit)
      .toBeGreaterThan(score({ title: 'React Developer', degreeMin: 'phd', degreeRequired: true }).fit)
  })

  // With nothing to rank on, nothing is held back.
  it('scores an empty profile without crashing', () => {
    expect(score({}, {}).fit).toBe(100)
  })

  it('matches skills at word edges only', () => {
    expect(score({ title: 'JavaScript Developer' }, { skills: ['java'] }).why.has).toEqual([])
    expect(score({ title: 'Java Developer' }, { skills: ['java'] }).why.has).toEqual([{ skill: 'Java', where: 'title' }])
    expect(score({ title: 'Product Manager' }, { skills: ['c', 'r', 'go'] }).why.has).toEqual([])
  })

  it('matches skills that carry symbols', () => {
    expect(score({ title: 'C++ Developer' }, { skills: ['c++'] }).why.has[0].skill).toBe('C++')
    expect(score({ title: 'ASP.NET Engineer' }, { skills: ['.net'] }).why.has[0].skill).toBe('.NET')
    expect(score({ title: 'Node.js Developer' }, { skills: ['node.js'] }).why.has[0].skill).toBe('Node.js')
  })

  // The snippet is 280 characters; the scorer reads the full text when the
  // row has it.
  it('prefers the full text over the snippet', () => {
    const got = score({ title: 'Developer', descriptionText: 'Requirements: - Python daily.', descriptionSnippet: 'nothing here' })
    expect(got.why.has.map((h) => h.skill)).toEqual(['Python'])
  })

  // Features are read at scrape time from the full body; the scorer must use
  // them rather than the clipped text the row kept.
  it('uses the features a row carries', () => {
    const features = { v: FEATURES_VERSION, skills: { python: 'req' }, band: null, from: null, titleLevel: null }
    const got = score({ title: 'Developer', descriptionText: 'no skills here', features })
    expect(got.why.has.map((h) => h.skill)).toEqual(['Python'])
  })
})

describe('scorePosting breakdown', () => {
  it('carries a ceiling in points that is not the raw weight', () => {
    const full = score({}, { skills: ['react'], titles: ['dev'], years: 2 })
    const skills = full.breakdown.find((d) => d.dimension === 'skills')
    expect(skills.weight).toBe(CONTENT_WEIGHTS.skills)
    expect(skills.max).toBe(60)
    // Dropping the titles part renormalises skills to the whole hundred.
    expect(score({}, { skills: ['react'], years: 2 }).breakdown).toEqual([
      expect.objectContaining({ dimension: 'skills', weight: CONTENT_WEIGHTS.skills, max: 100 }),
    ])
  })

  it('never reports points above the ceiling, and sums ceilings to a hundred', () => {
    const { breakdown } = score({ title: 'React Node Python Developer' }, { ...profile, titles: ['developer'] })
    for (const d of breakdown) expect(d.points).toBeLessThanOrEqual(d.max + 1e-9)
    expect(Math.round(breakdown.reduce((sum, d) => sum + d.max, 0))).toBe(100)
  })

  // The parts are the content; the gates then multiply it into the fit.
  it('adds up to the content, which the gates multiply into the fit', () => {
    const got = score({ title: 'React Developer', type: 'internship' }, { ...profile, titles: ['developer'] })
    expect(Math.round(got.breakdown.reduce((sum, d) => sum + d.points, 0))).toBe(got.content)
    const product = got.gates.reduce((p, g) => p * g.value, 1)
    // Within a point: the content shown is itself rounded.
    expect(Math.abs(got.fit - got.content * product)).toBeLessThanOrEqual(1)
  })

  it('leaves out a part the profile asked nothing of', () => {
    expect(score({}, { years: 2 }).breakdown).toEqual([])
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
