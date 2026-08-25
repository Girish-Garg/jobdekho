import { TITLE_CREDIT, BODY_CREDIT, skillRegex } from './fit-dimensions.js'

// The skills dimension: how much of the profile's stack this posting
// satisfies, 0 to 1, on the same scale as the dimensions in fit-dimensions.js.
// It lives apart from them only because it reads a whole posting rather than
// one field, and apart from score.js so the composer stays a composer.

// Rarity per skill, defaulting to 1 so the score degrades to unweighted rather
// than to zero when nobody has measured the corpus yet.
const weightOf = (idf, skill) => idf[skill] ?? 1

export function skillFit(posting, skills, idf = {}) {
  const title = String(posting.title || '').toLowerCase()
  const body = String(posting.descriptionText || posting.descriptionSnippet || '').toLowerCase()
  const matched = []
  const mentioned = []
  let earned = 0
  let available = 0
  for (const skill of skills) {
    const weight = weightOf(idf, skill)
    available += weight
    const re = skillRegex(skill)
    if (re.test(title)) {
      earned += weight * TITLE_CREDIT
      matched.push(skill)
    } else if (re.test(body)) {
      earned += weight * BODY_CREDIT
      mentioned.push(skill)
    }
  }
  // Dividing by the whole profile is what makes this coverage rather than a
  // count: three skills out of four is a better fit than three out of twenty.
  return { value: available ? earned / available : 0, matched, mentioned }
}
