import { DEGREES } from './degree.js'

// What a resume reduces to. Every field maps onto a dimension score.js
// already understands, which is what lets one profile rank postings.
export const EMPTY_PROFILE = { skills: [], years: null, degree: 'none', titles: [], locations: [] }

const clean = (list) => [...new Set(
  (Array.isArray(list) ? list : []).map((s) => String(s).toLowerCase().trim()).filter(Boolean),
)]

// Enough to rank well without building a SQL statement thousands of characters
// long. A resume listing 40 skills is mostly listing noise anyway.
const MAX_SKILLS = 25

// Number(null) and Number('') are both 0, so an unstated number of years read
// as a zero-year fresher rather than as unknown. GET /api/profile returns null
// for a year count nobody has entered, and a cleared form field sends "", so
// this was the common case, not an edge one: every senior posting came back
// "well outside your experience", and canRank judged a wholly empty profile
// rankable, which is the exact case it exists to catch. Only a value that is
// actually there is allowed to become a number.
export function normalizeProfile(input) {
  const src = input ?? {}
  const stated = src.years !== null && src.years !== undefined && src.years !== ''
  const years = stated ? Number(src.years) : NaN
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
