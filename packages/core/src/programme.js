import { sectionize } from './jd-sections.js'

// Whether a description says THIS job is an internship, apprenticeship or
// traineeship: "This is a 6-month internship", "About the internship",
// "Type: Paid, remote internship". Reading the word anywhere called a
// Microsoft engineering role an internship for "Associate's Degree or
// Apprenticeship", and "1-3 years or strong internship/projects" one too:
// those say what the candidate did before, not what the job is.
const STATEMENT = [
  /\bthis (?:is (?:an? )?)?(?:[\w/-]+ ){0,4}(?:internship|apprenticeship|traineeship)\b/i,
  /\b(?:paid|unpaid),?\s+(?:(?:remote|on-?site|hybrid|virtual)\s+)?internship\b/i,
  /\babout the (?:internship|apprenticeship|traineeship)\b/i,
  // A link after it is a pointer to a different posting ("Intern Position:
  // https://..."), not this one.
  /\b(?:internship|apprenticeship|traineeship) (?:duration|period|programme|program|opportunity|role|position|stipend)\b(?!\s*:\s*https?:)/i,
  /\bintern (?:programme|program|position|role|opportunity)\b(?!\s*:\s*https?:)/i,
]

// These two also describe a candidate's past ("completed a 6-month
// internship", "experience as an intern"), so they count only outside the
// qualifications.
const ROLE_ONLY = [
  /\b(?:\d{1,2}|one|two|three|four|five|six|twelve)[- ]?(?:months?|weeks?)(?: long)?(?:[- ](?:paid|unpaid|remote|on-?site|hybrid|full[- ]time|part[- ]time|structured))*[- ](?:internship|apprenticeship|traineeship)\b/i,
  /\b(?:as|hiring|seeking) an? intern\b/i,
]

// A list of where experience may come from: the word beside "or", "/" or a
// comma, or "internship experience". A list never counts.
const LISTED = /(?:\bor\s+|\/\s*|,\s*)(?:internships?|apprenticeships?|traineeships?)\b|\b(?:internships?|apprenticeships?|traineeships?)\s*(?:\/|,|\bor\b)|\b(?:internships?|apprenticeships?)[- ]?(?:experience|exposure)\b/i

// Benefits and equal-opportunity copy talk about the company's programmes
// in general ("a culture of collaboration and apprenticeship").
const SKIP = new Set(['benefits', 'eeo'])
const QUALIFYING = new Set(['req', 'nice'])

// { match, section } for the first programme statement, or null.
export function programmeIn(description = '', company = '') {
  if (!/intern|apprentic|trainee/i.test(description)) return null
  for (const unit of sectionize(description, company)) {
    if (SKIP.has(unit.section) || LISTED.test(unit.text)) continue
    const patterns = QUALIFYING.has(unit.section) ? STATEMENT : [...STATEMENT, ...ROLE_ONLY]
    for (const re of patterns) {
      const m = re.exec(unit.text)
      if (m) return { match: m[0], section: unit.section }
    }
  }
  return null
}
