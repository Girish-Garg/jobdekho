// Degree ladder, lowest to highest. "none" means the posting states no requirement.
export const DEGREES = ['none', 'bachelors', 'masters', 'phd']

const PHD = /\b(ph\.?\s?d\.?|doctorate|doctoral|d\.?phil)\b/i
const MASTERS = /\b(master'?s?|m\.?tech|m\.?sc|m\.?c\.?a|mba|post-?graduate)\b|\bm\.s\.|\bms\b(?=\s*[/,]|\s+(?:or|in|degree))/i
const BACHELORS = /\b(bachelor'?s?|b\.?tech|b\.?sc|b\.?c\.?a|under-?grad(?:uate)?)\b|\bb\.s\.|\bb\.e\.|\bbs\b(?=\s*[/,]|\s+(?:or|in|degree))/i

// "PhD preferred", "or equivalent experience" - a nice-to-have, not a gate.
const SOFT = /\b(preferred|nice to have|a plus|bonus|desirable|ideally|or equivalent|equivalent experience|equivalent practical)\b/i

// "Currently pursuing a B.Tech" wants a student, who by definition does not
// hold the degree yet. The floor stays at none rather than merely un-required:
// the posting asks for less than a completed degree, and a bachelors floor
// would hide it from the exact audience it was written for.
const STUDENT = /\b(?:pursuing|working towards?|enrolled in)\b[^.]{0,60}?\b(?:degree|graduation|bachelor|master|under-?grad(?:uate)?|b\.?\s?tech|m\.?\s?tech|b\.?sc|m\.?sc|bca|mca|mba)\b|\b(?:final|pre-?final|penultimate)[ -]year\b|\bcurrently (?:enrolled|studying)\b/i

// A posting listing "BS/MS/PhD in CS" is reachable with a bachelor's, so the
// floor is the LOWEST degree named, not the highest.
export function classifyDegree(title = '', description = '') {
  const text = `${title} ${description}`
  if (STUDENT.test(text)) return { degreeMin: 'none', degreeRequired: false }
  let degreeMin = 'none'
  if (BACHELORS.test(text)) degreeMin = 'bachelors'
  else if (MASTERS.test(text)) degreeMin = 'masters'
  else if (PHD.test(text)) degreeMin = 'phd'
  return { degreeMin, degreeRequired: degreeMin !== 'none' && !SOFT.test(text) }
}

export function degreeRank(degree) {
  const i = DEGREES.indexOf(degree)
  return i === -1 ? 0 : i
}
