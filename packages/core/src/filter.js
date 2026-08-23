import { classifyLevel } from './level.js'
import { degreeRank } from './degree.js'

const REMOTE_RE = /remote|work from home|wfh|worldwide|anywhere|global/i
// Region-locked-to-a-foreign-place remote (an Indian cannot apply). India/APAC are not here.
const FOREIGN_RE = /united states|\busa?\b|americas|canada|europe|emea|united kingdom|\buk\b|ireland|latam|brazil|mexico|germany|france|spain|netherlands|poland|portugal|singapore|australia|philippines|japan/i

// A posting is reachable if it is in India, or genuinely global-remote (not locked to a foreign region).
function locationOk(location, rules) {
  const loc = (location || '').toLowerCase()
  if (loc === '') return true
  if ((rules.locations ?? []).some((l) => loc.includes(l.toLowerCase()))) return true
  if (REMOTE_RE.test(loc) && !FOREIGN_RE.test(loc)) return true
  return false
}

// An empty or missing list means "no preference", so every level passes.
// `internshipOnly` is the pre-taxonomy spelling of `levels: ['internship']`.
function wantedLevels(rules) {
  if (rules.levels?.length) return rules.levels
  if (rules.internshipOnly) return ['internship']
  return null
}

function levelOk(posting, rules) {
  const wanted = wantedLevels(rules)
  if (!wanted) return true
  const level = posting.level || classifyLevel(posting.title, posting.descriptionSnippet)
  return wanted.includes(level)
}

// maxDegree is the highest degree the seeker holds: a master's holder still
// qualifies for bachelor's-floor roles, so this is a ceiling test on the floor.
function degreeOk(posting, rules) {
  if (!rules.maxDegree) return true
  return degreeRank(posting.degreeMin || 'none') <= degreeRank(rules.maxDegree)
}

// An empty include list means "no keyword restriction", matching how an empty
// `levels` means "any level". Without this a user who clears their keywords
// would silently match nothing instead of everything.
export function filter(posting, rules) {
  const hay = `${posting.title} ${posting.descriptionSnippet} ${posting.tags.join(' ')}`.toLowerCase()
  const include = rules.includeKeywords ?? []
  const exclude = rules.excludeKeywords ?? []
  if (include.length && !include.some((k) => hay.includes(k.toLowerCase()))) return false
  if (exclude.some((k) => hay.includes(k.toLowerCase()))) return false
  if (!levelOk(posting, rules)) return false
  if (!degreeOk(posting, rules)) return false
  return locationOk(posting.location, rules)
}
