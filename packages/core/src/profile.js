import { DEGREES } from './degree.js'

// What a resume reduces to. Every field maps onto a dimension the query layer
// already understands, which is what lets one profile both rank postings and
// populate the saved notification filter.
export const EMPTY_PROFILE = { skills: [], years: null, degree: 'none', titles: [], locations: [] }

const clean = (list) => [...new Set(
  (Array.isArray(list) ? list : []).map((s) => String(s).toLowerCase().trim()).filter(Boolean),
)]

// Enough to rank well without building a SQL statement thousands of characters
// long. A resume listing 40 skills is mostly listing noise anyway.
const MAX_SKILLS = 25

export function normalizeProfile(input) {
  const src = input ?? {}
  const years = Number(src.years)
  return {
    skills: clean(src.skills).slice(0, MAX_SKILLS),
    years: Number.isFinite(years) && years >= 0 ? years : null,
    degree: DEGREES.includes(src.degree) ? src.degree : 'none',
    titles: clean(src.titles).slice(0, MAX_SKILLS),
    locations: clean(src.locations),
  }
}

// Seniority you are plausibly a fit for, spanning one rung either side rather
// than a single point: someone with two years should still see entry roles.
// Null years means the resume never said, so nothing is ruled out.
export function levelsForYears(years) {
  if (years === null || years === undefined) return []
  if (years < 1) return ['internship', 'entry']
  if (years < 3) return ['entry', 'mid']
  if (years < 6) return ['mid', 'senior']
  if (years < 10) return ['senior', 'staff']
  return ['staff', 'executive']
}

// The notification filter the profile implies. Kept separate from the profile
// itself so a bad extraction can be corrected without silently rewriting the
// filter, and so the user can edit either one independently.
export function filterFromProfile(profile) {
  const p = normalizeProfile(profile)
  return {
    includeKeywords: [...p.skills, ...p.titles].slice(0, MAX_SKILLS),
    levels: levelsForYears(p.years),
    maxDegree: p.degree === 'none' ? null : p.degree,
    locations: p.locations,
  }
}
