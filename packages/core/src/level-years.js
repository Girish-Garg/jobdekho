// The level a stated amount of experience implies, read from a title or a
// description. Prose mentions years too ("we were founded 12 years ago"), so
// a number counts only when it reads as a requirement: a range or a plus
// ("2-4 years", "5+ years"), or the word experience next to it.
//
// A range never spans a line: a stored body starts each list item with "- ",
// so "Openings: 2" over "- 5 years in Go" would otherwise read "2-5 years".
// En and em dashes are ranges too, as in "1 to 3 years" written with one:
// read as nothing, they left "6 to 10 years" to a later, smaller number.
const RANGE = /(\d{1,2})[^\S\n]*(?:(\+)|(?:to|-|\u2013|\u2014)[^\S\n]*(\d{1,2}))\s*(?:years?|yrs?)\b/i
const AFTER = /(\d{1,2})\s*(?:years?|yrs?)\.?\s*(?:of\s+)?(?:experience|exp\b|in\b)/i
const BEFORE = /(?:experience|exp)\s*(?::|of)?\s*(\d{1,2})\s*(?:years?|yrs?)/i

// A line that is only an amount of years, as PwC writes "Years of experience
// required:" over "6 years" and Bosch "Additional Information" over "3 yrs".
// Not under a duration or a bond, which are years too but not experience.
const BARE_LINE = /^[^\S\n]*(\d{1,2})[^\S\n]*(?:(\+)|(?:to|-|\u2013|\u2014)[^\S\n]*(\d{1,2}))?[^\S\n]*\+?[^\S\n]*(?:years?|yrs?)\.?[^\S\n]*$/i
const NOT_EXPERIENCE = /duration|contract|tenure|term|bond|period|commitment|agreement/i

// "6+ months work or internship proven experience": less than a year asked.
const MONTHS = /\b(\d{1,2})\s*\+?\s*months?\s+(?:of\s+)?(?:work\s+|professional\s+|relevant\s+)?(?:or\s+internship\s+)?(?:proven\s+)?experience/i

export const levelForYears = (n) => (n <= 1 ? 'entry' : n <= 4 ? 'mid' : n <= 8 ? 'senior' : 'staff')

const plural = (n, word) => `${n} ${word}${Number(n) === 1 ? '' : 's'}`

function askedPhrase(m) {
  if (m[2]) return `Asks for ${m[1]}+ years`
  if (m[3]) return `Asks for ${m[1]} to ${m[3]} years`
  return `Asks for ${plural(m[1], 'year')}`
}

function bareLine(text) {
  let previous = ''
  for (const line of text.split('\n')) {
    const m = BARE_LINE.exec(line)
    if (m && !NOT_EXPERIENCE.test(previous)) return m
    if (line.trim()) previous = line
  }
  return null
}

// { level, evidence } for the first requirement-shaped number, or null.
export function yearsLevel(text) {
  const s = String(text || '')
  const m = RANGE.exec(s) || AFTER.exec(s) || BEFORE.exec(s) || bareLine(s)
  return m ? { level: levelForYears(Number(m[1])), evidence: askedPhrase(m) } : null
}

export function monthsAsked(text) {
  const m = MONTHS.exec(String(text || ''))
  return m ? { level: 'entry', evidence: `Asks for ${plural(m[1], 'month')} of experience` } : null
}
