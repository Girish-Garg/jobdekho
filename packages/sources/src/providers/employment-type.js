// ATS platforms encode employment type and seniority as loose enum strings:
// "internship", "Intern / Student", "working_student", "Trainee". Separators
// vary, so they are flattened to spaces before the word test runs.
const INTERN = /\b(interns?|internships?|apprentice(?:ship)?|trainee|student|co-?op)\b/i

// Only an explicit platform signal sets level. Anything ambiguous is left off
// so packages/core infers it from the title instead of trusting a stale enum.
export function internLevel(...parts) {
  const hit = parts.some((p) => INTERN.test(String(p || '').replace(/[_/]+/g, ' ')))
  return hit ? { level: 'internship' } : {}
}
