import { factCheckResume } from '../actions/resume-fact-check.js'
import { profileText } from './profile-text.js'
import { texToText } from './tex-text.js'

// What an AI-written document claims that neither the career record nor the
// document's own current text says: figures (a 40% that became 60%, a date
// moved a year), capitalised names (an employer, an institute, a "Senior"
// in front of a title) and technology words. The same deterministic check
// the resume tailoring already trusts (see actions/resume-fact-check.js),
// run in code after the model answered, so nothing the model says about its
// own work enters into it.
//
// Heuristic and never blocking: the card lists these as "Not in your
// profile: ..." for the person to look at before pressing Apply. Only
// proposals are checked; the person's own edits are theirs to make.
//
// The document's current text counts as known because the person already
// has it (and may have typed it), so a change that only rearranges the page
// raises nothing.
const MAX_FLAGS = 12

export function documentFactFlags({ tex, profile, currentTex = '' }) {
  const original = [profileText(profile), texToText(currentTex)].filter(Boolean).join('\n')
  const { factCheck } = factCheckResume({ original, tailored: texToText(tex), jd: '' })
  return [...new Set(factCheck.flags.map((flag) => flag.value))].slice(0, MAX_FLAGS)
}
