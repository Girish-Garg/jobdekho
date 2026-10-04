import { companyKey } from './company-key.js'

// Company ladders, read only where the company's own postings make a rung
// plain, never from what a code usually means elsewhere. IC4, B30, L3 and
// the like name different levels at different companies, and even within
// one: Sourcegraph wrote one IC4 role up as "a strong senior role" and the
// next as "a staff-level role". A rung that is not plain stays unknown.
//
// Barclays heads each posting's duties with its rank's expectations. Its
// Assistant Vice President and Vice President blocks sit on postings whose
// titles read Senior, Lead, AVP or VP, as the title rules read a bank's VP
// ranks. Its Analyst block also sits on a "Senior Test Engineer", so it is
// left out.
const LADDERS = {
  barclays: [[/^[^\S\n]*((?:Assistant )?Vice President) Expectations[^\S\n]*$/m, 'senior']],
}

// [{ level, evidence, rule }] for the rungs the company's ladder names.
export function ladderIn(description = '', company = '') {
  const found = []
  for (const [re, level] of LADDERS[companyKey(company)] ?? []) {
    const m = re.exec(description)
    if (m) found.push({ level, evidence: `Says "${m[1]} Expectations", a bank rank`, rule: 'ladder' })
  }
  return found
}
