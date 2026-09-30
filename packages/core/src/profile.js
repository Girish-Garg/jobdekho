import { DEGREES } from './degree.js'

// What a resume reduces to. Every field maps onto a part of the fit
// (skills and titles to content; years, degree and locations to the gates),
// which is what lets one profile rank postings.
export const EMPTY_PROFILE = { skills: [], years: null, degree: 'none', titles: [], locations: [] }

const clean = (list) => [...new Set(
  (Array.isArray(list) ? list : []).map((s) => String(s).toLowerCase().trim()).filter(Boolean),
)]

// Enough to rank well. A resume listing 40 skills is mostly listing noise,
// and every skill listed is one more thing each posting is checked for.
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
