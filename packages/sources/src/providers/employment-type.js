// ATS platforms encode employment type and seniority as loose enum strings:
// "internship", "Intern / Student", "working_student", "Trainee". Separators
// vary, so they are flattened to spaces before the word test runs.
const INTERN = /\b(interns?|internships?|apprentice(?:ship)?|trainee|student|co-?op)\b/i
// A permanent, full-time contract: Lever's "Full Time Employee", Ashby's
// "FullTime", LinkedIn's "Full-time", Microsoft's "Full-Time", a "Regular"
// worker type.
const JOB = /\b(full[ -]?time|permanent|regular)\b/i

const flat = (part) => String(part || '').replace(/[_/]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
const spelled = (part) => String(part || '').trim()

// Only an explicit platform signal sets level. Anything ambiguous is left off
// so packages/core infers it from the title instead of trusting a stale enum.
// `employment` is the board's own words, for the tag's evidence.
export function internLevel(...parts) {
  const hit = parts.find((p) => INTERN.test(flat(p)))
  return hit ? { level: 'internship', employment: spelled(hit) } : {}
}

// The board's word that a posting is a job, not an internship: core never
// makes such a posting an internship by inference from its text, only a
// title saying Intern does (see core's level.js). An intern word anywhere
// in the same fields wins, as internLevel reads it.
export function jobType(...parts) {
  if (parts.some((p) => INTERN.test(flat(p)))) return {}
  const hit = parts.find((p) => JOB.test(flat(p)))
  return hit ? { type: 'job', employment: spelled(hit) } : {}
}
