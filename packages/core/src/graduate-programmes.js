import { companyKey } from './company-key.js'

// A company's own name for its graduate programme, read only in that
// company's titles. MathWorks hires graduates with no experience, full time,
// into its Engineering Development Group and names it in the title
// ("Software Engineer - EDG"); at another company a group of that name, or
// the letters EDG, may be any team at any level. The programme's
// internships say Internship, which the title rules read first.
//
// A Map, not an object: the key is scraped text, and a real employer named
// Constructor keys to "constructor", which every plain object answers with
// a function of its own. That lookup threw and failed a whole refresh.
const PROGRAMMES = new Map([
  ['mathworks', /\b(?:Engineering Development Group|EDG)\b/],
])

// { level: 'entry', rule: 'programme', word } or null. "The MathWorks" is
// how the company's legal name begins.
export function graduateProgramme(title, company = '') {
  const programme = PROGRAMMES.get(companyKey(company).replace(/^the /, ''))
  const m = programme?.exec(String(title || ''))
  return m ? { level: 'entry', rule: 'programme', word: m[0] } : null
}
