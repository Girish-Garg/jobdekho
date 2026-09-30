// The word matcher and title words that other features share with the fit:
// the ghost check and the resume check read skills through skillRegex, and
// canRank reads target titles through titleTokens. The fit itself now
// reads skills through the skill table (see skill-find.js).

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Boundaries only on edges that are word characters, so "c++" still matches
// "C++ Developer" and ".net" still matches "ASP.NET".
export function skillPatternSource(skill, lead, tail) {
  return (/^\w/.test(skill) ? lead : '') + escapeRe(skill) + (/\w$/.test(skill) ? tail : '')
}

export function skillRegex(skill) {
  return new RegExp(skillPatternSource(skill, '(?<!\\w)', '(?!\\w)'))
}

// Seniority words are dropped: level has its own gate, so leaving "senior"
// in would let one signal count twice. Rank numerals go for the same
// reason. Single characters are noise once those are gone.
const TITLE_STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'for', 'in', 'at', 'to', 'with', 'on',
  'senior', 'junior', 'jr', 'sr', 'lead', 'staff', 'principal', 'associate',
  'intern', 'internship', 'trainee', 'i', 'ii', 'iii', 'iv', 'v',
])

export function titleTokens(text) {
  const found = String(text || '').toLowerCase().match(/[a-z0-9+#.]+/g) || []
  return [...new Set(found.filter((t) => t.length > 1 && !TITLE_STOP.has(t)))]
}
