import { TITLE_CREDIT, BODY_CREDIT, skillRegex } from './fit-dimensions.js'

// The skills dimension: how much of the profile's stack this posting
// satisfies, 0 to 1, on the same scale as the dimensions in fit-dimensions.js.
// It lives apart from them only because it reads a whole posting rather than
// one field, and apart from score.js so the composer stays a composer.

// Rarity per skill, defaulting to 1 so the score degrades to unweighted rather
// than to zero when nobody has measured the corpus yet.
const weightOf = (idf, skill) => idf[skill] ?? 1

// The matched weight at which this dimension pays half, in the same units the
// idf weights use (roughly 2 to 5 per skill), so this is about two solid
// title matches. Above it the curve keeps rising but flattens, so a posting
// that matches more always outranks one that matches less.
export const HALF_MATCH = 8

// Saturating, NOT a fraction of the profile. Dividing by every skill listed
// asks "does this job use everything the candidate knows", and the answer is
// always no: a real profile of 25 skills scored 4.3 out of 45 on its own best
// internship, because no posting names python, kotlin, figma and heroku at
// once. That put a hard ceiling near 60 on every job the user could see, and
// it meant learning a new skill made every posting a worse match.
//
// The question worth asking is "does this candidate have what this job needs",
// which depends on how much was matched and not on what else was listed. So
// the matched weight is scored directly, with diminishing returns.
export function skillFit(posting, skills, idf = {}) {
  const title = String(posting.title || '').toLowerCase()
  const body = String(posting.descriptionText || posting.descriptionSnippet || '').toLowerCase()
  const matched = []
  const mentioned = []
  let earned = 0
  for (const skill of skills) {
    const weight = weightOf(idf, skill)
    const re = skillRegex(skill)
    if (re.test(title)) {
      earned += weight * TITLE_CREDIT
      matched.push(skill)
    } else if (re.test(body)) {
      earned += weight * BODY_CREDIT
      mentioned.push(skill)
    }
  }
  return { value: earned / (earned + HALF_MATCH), matched, mentioned }
}
