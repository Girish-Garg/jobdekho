import { skillRegex } from '@jobdekho/core/fit-dimensions.js'
import { SKILL_TERMS } from './skill-terms.js'
import { spellingsOf } from '@jobdekho/core/skill-find.js'
import { contextAt } from './flag-context.js'

// Rules 2 and 4 of the fact check: a skill the rewrite names that the
// original does not show is a flag, and keyword coverage is counted before
// and after. Presence is decided by core's skillRegex on lowercased text: a
// strict word match, so "matches 9 of 14" counts exactly the words named.
//
// The terms looked for are the vocabulary plus whatever the model itself
// listed as used or missing. The model's list can only widen the check: a
// keyword it names is verified against the posting like any other, and if
// the rewrite carries it while the original does not, that is a flag too.
const MAX_CANDIDATES = 40
const MAX_TERM = 40

function candidates(keywords) {
  return keywords.slice(0, MAX_CANDIDATES)
    .map((k) => String(k).toLowerCase().trim())
    .filter((k) => k && k.length <= MAX_TERM && /[a-z]/.test(k))
}

const found = (term, hay) => hay.search(skillRegex(term))

// Shown loosely: the term, its plural or one of its other spellings, so
// "React" in the rewrite is honest when the original says "ReactJS". The
// spellings are core's skill table, the one the fit reads (skill-find.js),
// so the two never disagree about what React is; the counts stay strict.
const shownIn = (term, hay) => spellingsOf(term).some((s) => skillRegex(s).test(hay))

export function checkSkills({ original, tailored, jd, keywords = [] }) {
  const terms = [...new Set([...SKILL_TERMS, ...candidates(keywords)])]
  const o = original.toLowerCase()
  const t = tailored.toLowerCase()
  const j = jd.toLowerCase()
  const flags = []
  const named = []
  const before = []
  const after = []
  for (const term of terms) {
    const at = found(term, t)
    const honest = shownIn(term, o)
    if (at !== -1 && !honest) flags.push({ type: 'skill', value: term, context: contextAt(tailored, at) })
    if (found(term, j) === -1) continue
    named.push(term)
    if (found(term, o) !== -1) before.push(term)
    // Credit only what the original shows: an added skill raises nothing,
    // and is already flagged above.
    if (at !== -1 && honest) after.push(term)
  }
  return {
    flags,
    coverage: {
      before: before.length,
      after: after.length,
      total: named.length,
      gained: after.filter((term) => !before.includes(term)),
      missing: named.filter((term) => !after.includes(term)),
    },
  }
}
