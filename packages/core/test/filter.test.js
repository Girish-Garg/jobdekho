import { describe, it, expect } from 'vitest'
import { filter } from '@jobdekho/core/filter.js'

const rules = {
  includeKeywords: ['software', 'data'],
  excludeKeywords: ['senior'],
  locations: ['india', 'remote'],
  internshipOnly: true,
}
const base = {
  title: 'Software Intern', company: 'C', location: 'Bengaluru, India',
  descriptionSnippet: 'work on software', tags: [],
}

describe('filter', () => {
  it('keeps a relevant internship', () => {
    expect(filter(base, rules)).toBe(true)
  })
  it('drops roles that state another level when internshipOnly', () => {
    expect(filter({ ...base, title: 'Software Engineer', level: 'mid' }, rules)).toBe(false)
    expect(filter({ ...base, title: 'Senior Software Engineer' }, { ...rules, excludeKeywords: [] })).toBe(false)
  })

  // Nothing real is hidden by a level filter: the feed lists such postings
  // after the confirmed ones, marked.
  it('keeps a role that states no level at all', () => {
    expect(filter({ ...base, title: 'Software Engineer', level: null }, rules)).toBe(true)
    expect(filter({ ...base, title: 'Software Engineer' }, rules)).toBe(true)
  })
  it('drops excluded keywords', () => {
    expect(filter({ ...base, title: 'Senior Software Intern' }, rules)).toBe(false)
  })
  it('drops irrelevant keywords', () => {
    expect(filter({ ...base, title: 'Marketing Intern', descriptionSnippet: 'ads' }, rules)).toBe(false)
  })
  it('keeps remote even if city not listed', () => {
    expect(filter({ ...base, location: 'Remote' }, rules)).toBe(true)
  })
})

const open = { includeKeywords: ['software'], excludeKeywords: [], locations: ['india'] }
const senior = { ...base, title: 'Senior Software Engineer', level: 'senior' }

describe('filter levels', () => {
  it('accepts every level when no levels are named', () => {
    expect(filter(senior, open)).toBe(true)
    expect(filter({ ...base, level: 'executive' }, open)).toBe(true)
  })
  it('keeps only the levels asked for', () => {
    expect(filter(senior, { ...open, levels: ['senior', 'staff'] })).toBe(true)
    expect(filter(senior, { ...open, levels: ['internship', 'entry'] })).toBe(false)
  })
  it('infers the level when the posting has not been classified', () => {
    const raw = { ...base, title: 'Staff Software Engineer' }
    expect(filter(raw, { ...open, levels: ['staff'] })).toBe(true)
    expect(filter(raw, { ...open, levels: ['entry'] })).toBe(false)
  })
  it('still honours the older internshipOnly spelling', () => {
    expect(filter(senior, { ...open, internshipOnly: true })).toBe(false)
    expect(filter(base, { ...open, internshipOnly: true })).toBe(true)
  })
})

describe('filter degrees', () => {
  const phdRole = { ...base, degreeMin: 'phd' }
  const bsRole = { ...base, degreeMin: 'bachelors' }

  it('accepts any degree floor when the seeker states none', () => {
    expect(filter(phdRole, open)).toBe(true)
  })
  it('hides roles that need more than the seeker holds', () => {
    expect(filter(phdRole, { ...open, maxDegree: 'masters' })).toBe(false)
    expect(filter(bsRole, { ...open, maxDegree: 'bachelors' })).toBe(true)
  })
  it('lets a higher degree still reach lower floors', () => {
    expect(filter(bsRole, { ...open, maxDegree: 'phd' })).toBe(true)
    expect(filter({ ...base, degreeMin: 'none' }, { ...open, maxDegree: 'bachelors' })).toBe(true)
  })
})

describe('filter keyword edges', () => {
  it('treats an empty include list as no restriction', () => {
    expect(filter({ ...base, title: 'Blacksmith' }, { includeKeywords: [], excludeKeywords: [], locations: ['india'] })).toBe(true)
  })

  // "marketing" is meant to kill Marketing Intern roles, not a software role
  // whose body mentions the marketing website.
  it('applies exclude keywords to the title and tags, not the body', () => {
    const r = { ...open, excludeKeywords: ['marketing'] }
    expect(filter({ ...base, descriptionSnippet: 'Build the marketing website platform' }, r)).toBe(true)
    expect(filter({ ...base, title: 'Marketing Intern' }, r)).toBe(false)
    expect(filter({ ...base, tags: ['marketing'] }, r)).toBe(false)
  })
})

describe('filter locations', () => {
  it('matches configured locations on whole words only', () => {
    expect(filter({ ...base, location: 'Indianapolis, Indiana' }, rules)).toBe(false)
  })

  // config/filters.json ships most lists empty; reading that as "remote
  // only" would silently drop nearly every posting instead of keeping them.
  it('treats an empty locations list as no preference', () => {
    const anywhere = { includeKeywords: [], excludeKeywords: [], locations: [] }
    expect(filter(base, anywhere)).toBe(true)
    expect(filter({ ...base, location: 'Berlin, Germany' }, anywhere)).toBe(true)
  })

  // The old foreign denylist passed any country it had not heard of.
  it('rejects remote locked to an unreachable place', () => {
    expect(filter({ ...base, location: 'Remote (London)' }, rules)).toBe(false)
    expect(filter({ ...base, location: 'Remote - Argentina' }, rules)).toBe(false)
    expect(filter({ ...base, location: 'Remote - Israel' }, rules)).toBe(false)
  })

  it('keeps remote naming India, a reachable region, or no place at all', () => {
    expect(filter({ ...base, location: 'Remote - India' }, rules)).toBe(true)
    expect(filter({ ...base, location: 'Remote (Worldwide)' }, rules)).toBe(true)
    expect(filter({ ...base, location: 'Remote, APAC' }, rules)).toBe(true)
    expect(filter({ ...base, location: 'Fully remote' }, rules)).toBe(true)
  })
})

// The dashboard saves these rules and the notifier passes them straight in;
// ignoring them alerted "Remote only, 25k+" users about onsite unpaid roles.
// Null handling mirrors packages/db/src/posting-measures.js exactly.
describe('filter saved rules', () => {
  const p = { ...base, workMode: 'onsite', stipendMin: 10000, durationMonths: 6, experienceYears: null, source: 'internshala' }

  it('honours workModes, reading a missing mode as onsite', () => {
    expect(filter(p, { ...open, workModes: ['remote'] })).toBe(false)
    expect(filter(p, { ...open, workModes: ['onsite', 'remote'] })).toBe(true)
    expect(filter({ ...p, workMode: undefined }, { ...open, workModes: ['onsite'] })).toBe(true)
    expect(filter(p, { ...open, workModes: [] })).toBe(true)
  })

  // An unstated mode shows no chip, but Remote and Hybrid take only what
  // says so.
  it('keeps an unstated mode out of a Remote or Hybrid filter', () => {
    expect(filter({ ...p, workMode: null }, { ...open, workModes: ['remote'] })).toBe(false)
    expect(filter({ ...p, workMode: null }, { ...open, workModes: ['hybrid'] })).toBe(false)
    expect(filter({ ...p, workMode: null }, { ...open, workModes: ['onsite'] })).toBe(true)
  })

  it('fails a pay floor when the pay is below it or unstated', () => {
    expect(filter(p, { ...open, minStipend: 25000 })).toBe(false)
    expect(filter({ ...p, stipendMin: 30000 }, { ...open, minStipend: 25000 })).toBe(true)
    expect(filter({ ...p, stipendMin: null }, { ...open, minStipend: 25000 })).toBe(false)
  })

  it('fails a duration ceiling when the duration is over it or unstated', () => {
    expect(filter(p, { ...open, maxDurationMonths: 3 })).toBe(false)
    expect(filter(p, { ...open, maxDurationMonths: 6 })).toBe(true)
    expect(filter({ ...p, durationMonths: null }, { ...open, maxDurationMonths: 6 })).toBe(false)
  })

  // An unstated requirement is not a barrier, so null passes this one.
  it('passes an experience ceiling when the requirement is unstated', () => {
    expect(filter(p, { ...open, maxExperienceYears: 1 })).toBe(true)
    expect(filter({ ...p, experienceYears: 3 }, { ...open, maxExperienceYears: 1 })).toBe(false)
    expect(filter({ ...p, experienceYears: 1 }, { ...open, maxExperienceYears: 1 })).toBe(true)
  })

  it('honours source restrictions', () => {
    expect(filter(p, { ...open, sources: ['internshala'] })).toBe(true)
    expect(filter(p, { ...open, sources: ['unstop'] })).toBe(false)
    expect(filter(p, { ...open, excludedSources: ['internshala'] })).toBe(false)
    expect(filter(p, { ...open, sources: [], excludedSources: [] })).toBe(true)
  })

  it('drops the null a failed normalize returns', () => {
    expect(filter(null, open)).toBe(false)
  })
})
