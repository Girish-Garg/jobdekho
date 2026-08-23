// The saved filter's numeric rules, applied to a normalized posting. This is
// the in-process mirror of packages/db/src/posting-measures.js: browsing and
// alerts have to agree, so the null handling matches the SQL exactly.

// Saved filters can carry numbers as strings; Number.isFinite('1') is false,
// which would silently drop the rule instead of applying it.
function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

// A posting with no stated pay or tenure cannot be shown to satisfy a floor,
// so null fails those. Experience is the exception: an unstated requirement is
// not a barrier, so null passes.
export function measuresOk(posting, rules) {
  const pay = toNumber(rules.minStipend)
  const months = toNumber(rules.maxDurationMonths)
  const years = toNumber(rules.maxExperienceYears)
  if (pay !== null && (posting.stipendMin == null || posting.stipendMin < pay)) return false
  if (months !== null && (posting.durationMonths == null || posting.durationMonths > months)) return false
  if (years !== null && posting.experienceYears != null && posting.experienceYears > years) return false
  return true
}
