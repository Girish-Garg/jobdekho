import { aiCheck } from './ai-check.js'
import { latexCheck } from './latex-check.js'
import { profileCheck } from './profile-check.js'
import { postingsCheck } from './postings-check.js'
import { webCheck } from './web-check.js'
import { localCheck } from './local-check.js'
import { applyCheck } from './apply-check.js'

// What a first run needs, in the order a person would set it up: an AI, PDF
// making, a profile, postings; then the ones that are nice to have, which are
// 'optional' when absent and never 'missing', so a notice that shows only
// while something required is missing never nags about them.
//
// Each check is { id, label, state: 'ok' | 'missing' | 'optional', detail,
// fix }, where `fix` is one sentence on what to do, null once it is ok. All
// of it is worked out from what the caller already has in hand: detection
// rows, a PATH lookup, the profile and the store, never a model call.
export function setupChecks({ rows = [], latexPath = null, profile = null, sources = [], runs = [], now = Date.now(), browser }) {
  return [
    aiCheck(rows),
    latexCheck(latexPath),
    profileCheck(profile),
    postingsCheck({ sources, runs, now }),
    webCheck(rows),
    localCheck(rows),
    applyCheck(browser),
  ].filter(Boolean)
}
