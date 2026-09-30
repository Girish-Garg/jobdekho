import { titleLevel } from './title-level.js'

// How many years a posting asks for, read from its text. A number counts
// only when it reads as a requirement ("5+ years", "3-5 years", "minimum 2
// years", "2 years of experience"), never "founded 20 years ago" or "a 4
// year degree".
const RANGE = /(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:-|\u2013|to)\s*(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b/i
const PLUS = /(\d{1,2})\s*\+\s*(?:years?|yrs?)\b|(\d{1,2})\s*(?:years?|yrs?)\s*\+/i
const MINIMUM = /(?:minimum|min\.?|at least|atleast|more than)\s*(?:of\s*)?(\d{1,2})\s*(?:years?|yrs?)\b/i
const PLAIN = /(\d{1,2})\s*(?:years?|yrs?)(?:\s+of)?(?:\s+[\w/+.#-]+){0,4}?\s+(?:experience|exp\b)/i
const BEFORE = /(?:experience|exp)\s*(?:of|:|-)?\s*(\d{1,2})\s*(?:years?|yrs?)\b/i
const NOT_ASKED = /\b(?:ago|founded|since|old\b|history|anniversary|in business|degree|program|course|bachelor|warranty)\b/i

export function yearsIn(text) {
  const s = String(text || '')
  if (NOT_ASKED.test(s) && !/experience/i.test(s)) return null
  let m = RANGE.exec(s)
  if (m) return [Number(m[1]), Number(m[2])]
  m = PLUS.exec(s)
  if (m) return [Number(m[1] ?? m[2]), Number(m[1] ?? m[2]) + 4]
  m = MINIMUM.exec(s) || PLAIN.exec(s) || BEFORE.exec(s)
  return m ? [Number(m[1]), Number(m[1]) + 3] : null
}

const ASKING = new Set(['req', 'resp', 'intro', 'other', 'nice'])

// The band of years a posting asks for, and where that came from. Years in
// the text win over title words: "Senior Engineer, 3+ years" is a three year
// job at a company that calls it senior. Requirement lines win over the
// rest, and of several the highest floor stands, since "2+ years of React"
// sits beside "5+ years overall" and the second is the real bar.
export function yearsAsked({ title, units = [], experienceYears = null }) {
  const found = []
  for (const u of units) {
    if (!ASKING.has(u.section)) continue
    const y = yearsIn(u.text)
    if (y && y[0] <= 20) found.push({ y, req: u.section === 'req' })
  }
  const inTitle = yearsIn(title)
  if (inTitle) found.push({ y: inTitle, req: true })
  const tl = titleLevel(title)
  const pool = found.some((f) => f.req) ? found.filter((f) => f.req) : found
  if (pool.length) {
    const min = Math.max(...pool.map((f) => f.y[0]))
    return { band: [min, Math.max(min, ...pool.map((f) => f.y[1]))], from: 'years', titleLevel: tl?.level ?? null }
  }
  if (Number.isFinite(experienceYears)) return { band: [experienceYears, experienceYears + 3], from: 'board', titleLevel: tl?.level ?? null }
  if (tl) return { band: tl.band, from: 'title', titleLevel: tl.level }
  return { band: null, from: null, titleLevel: null }
}
