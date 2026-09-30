// Avature prints a date the way each tenant set its portal up: Lenovo's list
// says "Posted 30-Sep-2026" and its posting "Wednesday, September 30, 2026",
// Siemens' posting "Posted since 30-Sep-2026", and Deloitte's schema.org
// block "2026-09-25". Date.parse would read the first two in the machine's
// own time zone, so a posting would change day with the computer it was
// scraped on; they are read by hand, as midnight UTC.
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const month = (name) => MONTHS.indexOf(String(name).slice(0, 3).toLowerCase())

const ISO = /\b(\d{4})-(\d{2})-(\d{2})\b/
const DAY_MONTH_YEAR = /\b(\d{1,2})[-\s]([A-Za-z]{3,9})\.?[-\s,]+(\d{4})\b/
const MONTH_DAY_YEAR = /\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/

function parts(s) {
  let m = s.match(ISO)
  if (m) return [+m[1], +m[2] - 1, +m[3]]
  m = s.match(DAY_MONTH_YEAR)
  if (m && month(m[2]) >= 0) return [+m[3], month(m[2]), +m[1]]
  m = s.match(MONTH_DAY_YEAR)
  if (m && month(m[1]) >= 0) return [+m[3], month(m[1]), +m[2]]
  return null
}

// ISO 8601 at midnight UTC, or null for anything that is not a real date
// ("31-Feb-2026" included, rather than rolling over into March).
export function dateFrom(text) {
  const p = parts(String(text || ''))
  if (!p) return null
  const [y, m, d] = p
  const at = new Date(Date.UTC(y, m, d))
  return at.getUTCMonth() === m && at.getUTCDate() === d ? at.toISOString() : null
}
