import { contextAt } from './flag-context.js'

// Rule 3 of the fact check, the titles half: a title word the rewrite uses
// that the original never does. "Developer" becoming "Engineer", or "Senior"
// appearing in front of a title, is the invention a name-phrase check misses
// when the rest of the line is unchanged, and it is the one a recruiter
// checks first. Matched whole and case-insensitive, so "engineer" is not
// found in "engineering", and prose counts as much as a title line: "as a
// manager" is a claim too.
//
// Words that are as often verbs ("lead", "head") are left out: "lead the
// migration" is not a title, and measured on an honest rewrite they were the
// only noise this rule produced.
const TITLE_WORDS = [
  'engineer', 'developer', 'programmer', 'manager', 'analyst', 'architect', 'consultant', 'scientist',
  'designer', 'intern', 'director', 'founder', 'co-founder', 'cofounder', 'associate', 'specialist',
  'administrator', 'executive', 'officer', 'coordinator', 'trainee', 'president', 'chief', 'fellow',
  'researcher', 'tester', 'senior', 'junior', 'principal', 'sde', 'cto', 'ceo', 'cfo', 'coo',
  'professor', 'lecturer', 'teacher', 'instructor', 'freelancer', 'volunteer',
]

const wordsOf = (text) => new Set(text.toLowerCase().match(/[a-z]+(?:-[a-z]+)*/g) || [])

// `covered` is the values already flagged as new names: a title word inside
// "Senior Software Engineer" is the same finding, and one flag is enough.
export function checkTitles(original, tailored, covered = []) {
  const known = wordsOf(original)
  const inNames = covered.map((v) => v.toLowerCase())
  const flags = []
  for (const word of TITLE_WORDS) {
    if (known.has(word)) continue
    const m = new RegExp(`(?<![a-z-])${word}(?![a-z-])`, 'i').exec(tailored)
    if (!m || inNames.some((v) => v.includes(word))) continue
    flags.push({ type: 'name', value: m[0], context: contextAt(tailored, m.index) })
  }
  return flags
}
