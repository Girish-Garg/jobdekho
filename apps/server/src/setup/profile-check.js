import { canRank } from '@jobdekho/core/score.js'
import { normalizeProfile } from '@jobdekho/core/profile.js'
import { counted, listed } from './words.js'

// Whether the feed can be ranked, by the same test the feed itself applies
// (see core's score.js): skills, target titles or years. A profile without
// any of them is not an error, but Best fit then quietly lists the newest
// postings, so the check calls it missing until there is something to rank
// against, and says what it ranks against once there is.
const FIX = 'Open Profile and upload a resume, or fill it in by hand.'

const NO_PROFILE = 'No profile yet, so postings are listed newest first rather than by fit.'
const TOO_THIN = 'Your profile has no skills, target titles or years of experience yet, so postings cannot be ranked by fit.'

function rankedBy(profile) {
  const p = normalizeProfile(profile)
  const parts = [
    p.skills.length && counted(p.skills.length, 'skill'),
    p.titles.length && counted(p.titles.length, 'target title'),
    p.years !== null && `${counted(p.years, 'year')} of experience`,
  ].filter(Boolean)
  return listed(parts)
}

export function profileCheck(profile) {
  const base = { id: 'profile', label: 'Your profile' }
  if (!profile) return { ...base, state: 'missing', detail: NO_PROFILE, fix: FIX }
  if (!canRank(profile)) return { ...base, state: 'missing', detail: TOO_THIN, fix: FIX }
  return { ...base, state: 'ok', detail: `Postings are ranked against your ${rankedBy(profile)}.`, fix: null }
}
