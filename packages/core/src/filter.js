const INTERN_RE = /intern|internship|trainee|industrial training/i
const REMOTE_RE = /remote|work from home|wfh|worldwide|anywhere|global/i
// Region-locked-to-a-foreign-place remote (an Indian cannot apply). India/APAC are not here.
const FOREIGN_RE = /united states|\busa?\b|americas|canada|europe|emea|united kingdom|\buk\b|ireland|latam|brazil|mexico|germany|france|spain|netherlands|poland|portugal|singapore|australia|philippines|japan/i

// A posting is reachable if it is in India, or genuinely global-remote (not locked to a foreign region).
function locationOk(location, rules) {
  const loc = (location || '').toLowerCase()
  if (loc === '') return true
  if (rules.locations.some((l) => loc.includes(l.toLowerCase()))) return true
  if (REMOTE_RE.test(loc) && !FOREIGN_RE.test(loc)) return true
  return false
}

export function filter(posting, rules) {
  const hay = `${posting.title} ${posting.descriptionSnippet} ${posting.tags.join(' ')}`.toLowerCase()
  if (!rules.includeKeywords.some((k) => hay.includes(k.toLowerCase()))) return false
  if (rules.excludeKeywords.some((k) => hay.includes(k.toLowerCase()))) return false
  if (rules.internshipOnly && !INTERN_RE.test(`${posting.title} ${hay}`)) return false
  return locationOk(posting.location, rules)
}
