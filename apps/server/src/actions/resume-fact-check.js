import { checkNumbers } from './resume-numbers.js'
import { checkDates } from './resume-dates.js'
import { checkSkills } from './resume-skills.js'
import { checkNames } from './resume-names.js'
import { checkTitles } from './resume-titles.js'

// The deterministic check that makes the resume tailoring safe to use: the
// rewrite is held against the original in code, after the model has
// answered, and the model's own claims about what it did never enter into
// it. Four rules, each in its own file (the first in two):
//
//   1. numbers   every figure in the rewrite is in the original, and every
//                date as written
//   2. skills    every skill the feed's matcher finds in the rewrite, the
//                original shows (under any of its spellings)
//   3. names     no capitalised phrase or title word the original lacks
//   4. coverage  how many of the posting's skills each text matches, with
//                only honest gains credited
//
// `ok` is simply "no flags": there is no partial credit for a small
// invention, because the person is about to send this to an employer.
export function factCheckResume({ original, tailored, jd, keywords = [] }) {
  const skills = checkSkills({ original, tailored, jd, keywords })
  const names = checkNames(original, tailored)
  const titles = checkTitles(original, tailored, names.map((f) => f.value))
  const flags = [
    ...checkNumbers(original, tailored), ...checkDates(original, tailored), ...skills.flags, ...names, ...titles,
  ]
  return { factCheck: { flags, ok: flags.length === 0 }, coverage: skills.coverage }
}
