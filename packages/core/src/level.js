// Seniority ladder, lowest to highest. Index order drives range comparisons.
export const LEVELS = ['internship', 'entry', 'mid', 'senior', 'staff', 'executive']

const INTERNSHIP = /\b(intern|interns|internship|trainee|apprentice|co-?op|industrial training|summer analyst)\b/i
const EXECUTIVE = /\b(chief|cto|ceo|coo|cfo|cio|ciso|vice[ -]president|vp|head of|director|president)\b/i
const STAFF = /\b(staff|principal|distinguished|fellow|architect)\b/i
const SENIOR_WORD = /\b(senior|snr|sr)\b/i
const SENIOR_ROLE = /\b(lead|manager|supervisor)\b/i
const ENTRY = /\b(graduate|new ?grad|fresher|junior|jr|associate|entry[ -]level|campus|rotational|early career)\b/i

// A body mention of interns is usually about colleagues ("you will mentor our
// interns"), so only the programme itself counts as a description-level signal.
// "non-internship" and "internship experience" are the opposite: Amazon asks
// every engineer for "3+ years of non-internship professional experience",
// which marked its whole India board as internships.
const BODY_INTERNSHIP = /(?<!non[- ]?)\b(internship|traineeship|apprenticeship|intern (?:programme|program|position|role|opportunity)|(?:as|hiring|seeking) an? intern)\b(?![- ]?experience)/i

// Trailing rank marker: "Software Engineer II", "SDE 3", "Analyst IV".
const RANK = /\b(i{1,3}|iv|v|[1-5])\s*$/i
// "Team 1" is a group name, not a rung: without this, every "X - Team 1"
// title read as entry level.
const NOT_RANK = /\b(team|group|squad|pod|unit|shift|batch|track|req)\s*#?\s*(i{1,3}|iv|v|[1-5])\s*$/i
const RANK_LEVEL = {
  i: 'entry', 1: 'entry', ii: 'mid', 2: 'mid', iii: 'senior',
  3: 'senior', iv: 'staff', 4: 'staff', v: 'staff', 5: 'staff',
}

// Prose mentions years too ("we were founded 12 years ago"), which used to set
// seniority. A number only counts when it reads as a requirement: a range or a
// plus ("2-4 years", "5+ years"), or the word experience next to it.
// The range never spans a line: a stored body now starts each list item with
// "- ", so "Openings: 2" over "- 5 years in Go" would otherwise read "2-5 years".
const YEARS_RANGE = /(\d{1,2})[^\S\n]*(?:\+|(?:to|-)[^\S\n]*\d{1,2})\s*(?:years?|yrs?)\b/i
const YEARS_AFTER = /(\d{1,2})\s*(?:years?|yrs?)\.?\s*(?:of\s+)?(?:experience|exp\b|in\b)/i
const YEARS_BEFORE = /(?:experience|exp)\s*(?::|of)?\s*(\d{1,2})\s*(?:years?|yrs?)/i

function fromYears(text) {
  const s = text || ''
  const m = YEARS_RANGE.exec(s) || YEARS_AFTER.exec(s) || YEARS_BEFORE.exec(s)
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
// Amazon and others put the team after the role: "Software Development
// Engineer II, Prime Video Resilience". The rank closes the role, not the
// whole title, so it is also looked for at the end of that first part.
const ROLE_PART = /\s*,\s*|\s+[-|]\s+/

export function classifyLevel(title = '', description = '') {
  const t = String(title).trim()
  if (INTERNSHIP.test(t)) return 'internship'
  if (EXECUTIVE.test(t)) return 'executive'
  if (STAFF.test(t)) return 'staff'
  if (SENIOR_WORD.test(t)) return 'senior'
  if (ENTRY.test(t)) return 'entry'
  if (SENIOR_ROLE.test(t)) return 'senior'
  const role = t.split(ROLE_PART)[0]
  const ranked = [t, role].find((part) => RANK.test(part) && !NOT_RANK.test(part))
  if (ranked) return RANK_LEVEL[RANK.exec(ranked)[1].toLowerCase()]
  if (BODY_INTERNSHIP.test(description)) return 'internship'
  // Some boards put the range in the title itself, e.g. "Firmware Engineer(5-7 years)".
  return fromYears(t) || fromYears(description) || 'mid'
}

export function levelRank(level) {
  const i = LEVELS.indexOf(level)
  return i === -1 ? LEVELS.indexOf('mid') : i
}
