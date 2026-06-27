const INTERN_RE = /intern|internship|trainee|industrial training/i

export function filter(posting, rules) {
  const hay = `${posting.title} ${posting.descriptionSnippet} ${posting.tags.join(' ')}`.toLowerCase()
  if (!rules.includeKeywords.some((k) => hay.includes(k.toLowerCase()))) return false
  if (rules.excludeKeywords.some((k) => hay.includes(k.toLowerCase()))) return false
  if (rules.internshipOnly && !INTERN_RE.test(`${posting.title} ${hay}`)) return false
  const loc = posting.location.toLowerCase()
  if (loc === '' || /remote/.test(loc)) return true
  return rules.locations.some((l) => loc.includes(l.toLowerCase()))
}
