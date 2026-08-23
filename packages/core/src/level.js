// Seniority ladder, lowest to highest. Index order drives range comparisons.
export const LEVELS = ['internship', 'entry', 'mid', 'senior', 'staff', 'executive']

const INTERNSHIP = /\b(intern|interns|internship|trainee|apprentice|co-?op|industrial training|summer analyst)\b/i
const EXECUTIVE = /\b(chief|cto|ceo|coo|cfo|cio|ciso|vice[ -]president|vp|head of|director|president)\b/i
const STAFF = /\b(staff|principal|distinguished|fellow|architect)\b/i
const SENIOR_WORD = /\b(senior|snr|sr)\b/i
const SENIOR_ROLE = /\b(lead|manager|supervisor)\b/i
const ENTRY = /\b(graduate|new ?grad|fresher|junior|jr|associate|entry[ -]level|campus|rotational|early career)\b/i

// Trailing rank marker: "Software Engineer II", "SDE 3", "Analyst IV".
const RANK = /\b(i{1,3}|iv|v|[1-5])\s*$/i
const RANK_LEVEL = {
  i: 'entry', 1: 'entry', ii: 'mid', 2: 'mid', iii: 'senior',
  3: 'senior', iv: 'staff', 4: 'staff', v: 'staff', 5: 'staff',
}

// Years of experience, read from the body only when the title carries no marker.
const YEARS = /(\d{1,2})\s*\+?\s*(?:to|-)?\s*\d{0,2}\s*(?:years?|yrs?)/i

function fromYears(text) {
  const m = YEARS.exec(text || '')
  if (!m) return null
  const n = Number(m[1])
  if (n <= 1) return 'entry'
  if (n <= 4) return 'mid'
  if (n <= 8) return 'senior'
  return 'staff'
}

// The title carries the signal; the body is only a fallback. Rules run most
// specific first, and an explicit "senior" outranks a role word like "manager"
// so that "Associate Product Manager" still lands on entry rather than senior.
export function classifyLevel(title = '', description = '') {
  const t = String(title).trim()
  if (INTERNSHIP.test(t)) return 'internship'
  if (EXECUTIVE.test(t)) return 'executive'
  if (STAFF.test(t)) return 'staff'
  if (SENIOR_WORD.test(t)) return 'senior'
  if (ENTRY.test(t)) return 'entry'
  if (SENIOR_ROLE.test(t)) return 'senior'
  const rank = RANK.exec(t)
  if (rank) return RANK_LEVEL[rank[1].toLowerCase()]
  if (INTERNSHIP.test(description)) return 'internship'
  // Some boards put the range in the title itself, e.g. "Firmware Engineer(5-7 years)".
  return fromYears(t) || fromYears(description) || 'mid'
}

export function levelRank(level) {
  const i = LEVELS.indexOf(level)
  return i === -1 ? LEVELS.indexOf('mid') : i
}
