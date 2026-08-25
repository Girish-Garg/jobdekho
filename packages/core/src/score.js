import { normalizeProfile, levelsForYears } from './profile.js'
import { titleFit, levelFit, degreeFit, titleTokens } from './fit-dimensions.js'
import { skillFit } from './skill-fit.js'

// Fit is a percentage, not an accumulating tally. The tally it replaced scored
// 1485 real postings onto 22 distinct values, with 45% of the feed sharing one
// of them, so two thirds of a "recommended" feed was really just ordered by
// date. A percentage built from continuous dimensions separates rows that a
// sum of fixed bonuses could not tell apart.
//
// The weights are a claim about what makes a job worth reading: what it is
// built with, what it is called, whether you can get it, and whether you are
// allowed to apply.
export const WEIGHTS = { skills: 45, titles: 25, level: 20, degree: 10 }

// packages/db reads every constant and table through this module so the SQL
// mirror cannot drift from the scorer; pieces that moved to their own files
// stay exported here for the same reason.
export { skillFit }
export { levelFitTable } from './fit-dimensions.js'
export { GRADE_BANDS, gradeFor } from './grade.js'

// A dimension the profile says nothing about is dropped rather than scored
// zero. Scoring it zero would punish an incomplete profile with a low ceiling:
// somebody who listed skills but no target titles could never clear 75.
export function dimensionWeights(profile) {
  const p = normalizeProfile(profile)
  const active = {
    skills: p.skills.length > 0,
    titles: p.titles.length > 0,
    level: p.years !== null,
    degree: true,
  }
  const weights = Object.fromEntries(
    Object.entries(WEIGHTS).map(([k, w]) => [k, active[k] ? w : 0]),
  )
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  return { ...weights, total }
}

// The single source of truth for the ranking. packages/db/src/posting-score.js
// mirrors it as SQL so that ordering happens across the whole matching set
// before LIMIT, and reads the weights and tables from here so the two cannot
// drift apart on what counts as a match.
export function scorePosting(posting, profile, idf = {}) {
  const p = normalizeProfile(profile)
  const w = dimensionWeights(p)
  const skills = skillFit(posting, p.skills, idf)
  const values = {
    skills: skills.value,
    titles: titleFit(posting.title, p.titles),
    level: levelFit(posting.level || 'mid', levelsForYears(p.years)),
    degree: degreeFit(posting.degreeMin, p.degree),
  }
  const earned = Object.entries(values).reduce((sum, [k, v]) => sum + w[k] * v, 0)
  // A dropped dimension is left out of the breakdown rather than shown at
  // zero: zero reads as a failed match, and the dimension was dropped
  // precisely because the profile asked nothing of it. Points stay unrounded
  // so they sum to the fit before its own rounding; rounding each part here
  // could drift the total a point away from the fit the card shows.
  const breakdown = Object.entries(values)
    .filter(([k]) => w[k] > 0)
    .map(([dimension, value]) => ({
      dimension, value, weight: w[dimension], points: (100 * w[dimension] * value) / w.total,
    }))
  return {
    fit: w.total ? Math.round((100 * earned) / w.total) : 0,
    matched: skills.matched,
    mentioned: skills.mentioned,
    titleFit: values.titles,
    levelFit: values.level,
    reachable: values.degree === 1,
    breakdown,
  }
}

// Why a posting ranked where it did, in the user's words rather than a number.
// An opaque score is not trustworthy enough to sort a job hunt by, and two of
// these are warnings, which is why the UI labels the block fit rather than
// recommendation.
export function explainScore(posting, profile, idf = {}) {
  const { fit, matched, mentioned, titleFit: title, levelFit: level, reachable } =
    scorePosting(posting, profile, idf)
  const reasons = []
  if (matched.length) reasons.push(`matches ${matched.join(', ')}`)
  else if (mentioned.length) reasons.push(`mentions ${mentioned.join(', ')}`)
  if (title >= 0.5) reasons.push('close to a title you want')
  if (level === 1) reasons.push('suits your experience')
  else if (level <= 0.2) reasons.push('well outside your experience')
  if (!reachable) reasons.push('needs a higher degree than you listed')
  return { fit, reasons }
}

// An empty profile scores every posting alike, so ranking by it would only
// shuffle the feed. Titles count here as well as skills and years: a profile
// naming only a target title is still something to rank against.
export function canRank(profile) {
  const p = normalizeProfile(profile)
  return p.skills.length > 0 || p.years !== null || titleTokens(p.titles.join(' ')).length > 0
}
