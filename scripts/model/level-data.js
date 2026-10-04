import { LEVELS } from '@jobdekho/core/level.js'
import { titleSays, spaced } from '@jobdekho/core/title-rules.js'
import { yearsLevel } from '@jobdekho/core/level-years.js'
import { levelFeatures, textWords } from '@jobdekho/core/model/level-features.js'
import { foldOf } from './random.js'

// The level model is asked only about postings with text of their own: a
// title and a company alone left it guessing from the company's other
// postings, and a bare card is fetched in full when opened anyway.
export const MIN_WORDS = 60

// A title the rules read a level from. Such a posting is trained on with
// the title's level words hidden, but the postings the model is really
// asked about never had any, so the held-out numbers are also given for
// the postings whose title said nothing (their level came from the text
// or the board), which look most like them.
const marked = (title) => Boolean(titleSays(title) || yearsLevel(spaced(title)))

// known:   postings step 1 placed, with text: the training and test set
// unknown: postings step 1 left unknown: what the model is for
export function levelExamples(postings) {
  const example = (p) => ({ ...p, features: levelFeatures(p), fold: foldOf(p.companyKey), withText: textWords(p.description) >= MIN_WORDS })
  const known = []
  const unknown = []
  for (const p of postings) {
    if (p.level) {
      const e = example(p)
      if (e.withText) known.push({ ...e, y: LEVELS.indexOf(p.level), marked: marked(p.title), from: p.levelTag?.from ?? null })
    } else {
      unknown.push(example(p))
    }
  }
  return { known, unknown }
}
