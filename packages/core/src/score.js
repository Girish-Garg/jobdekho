import { normalizeProfile } from './profile.js'
import { titleTokens } from './fit-dimensions.js'
import { featuresOf } from './posting-features.js'
import { skillCoverage } from './skill-coverage.js'
import { titleMatch } from './title-match.js'
import { fitGates, gateProduct } from './fit-gates.js'
import { buildBreakdown } from './breakdown.js'
import { explainFit } from './fit-explain.js'

export { GRADE_BANDS, gradeFor } from './grade.js'
export { fitContext } from './fit-context.js'

// Fit is content times gates. Content is what the job is built with (how
// much of what it asks for the person holds) and what it is called (how
// close the title is to one they want). The gates are the level, the place,
// internship or job, and the degree: the things that make a well-worded job
// one this person cannot take (see fit-gates.js).
//
// It replaced a weighted sum of skills, title, level and degree whose skill
// part barely moved (mean 0.07 across a real feed), so title words and a
// default "mid" level decided the order, and a test role in the wrong city
// graded A. Measured against hand labels on two profiles, nDCG@10 went from
// 0.21 and 0.60 to 0.90 and 1.00.
//
// A part the profile says nothing about is dropped rather than scored zero,
// so an incomplete profile is not capped below a hundred forever. With
// neither skills nor titles, content is 1 and only the gates rank.
export const CONTENT_WEIGHTS = { skills: 60, titles: 40 }

// `ctx` is fitContext(profile, rarity), built once per request. `features`
// are the posting's stored ones; the store passes them already read for
// rows stored before features existed.
export function scorePosting(row, ctx, features = featuresOf(row)) {
  const cov = ctx.skills ? skillCoverage(features.skills, ctx, row) : null
  const title = ctx.titles.length ? titleMatch(row.title, ctx.titles) : null
  const weights = { skills: cov ? CONTENT_WEIGHTS.skills : 0, titles: title ? CONTENT_WEIGHTS.titles : 0 }
  weights.total = weights.skills + weights.titles
  const values = { skills: cov?.value ?? 0, titles: title?.value ?? 0 }
  const content = weights.total
    ? (weights.skills * values.skills + weights.titles * values.titles) / weights.total
    : 1
  const gates = fitGates(row, features, ctx)
  return {
    fit: Math.round(100 * content * gateProduct(gates)),
    content: Math.round(100 * content),
    breakdown: buildBreakdown(values, weights),
    ...explainFit({ cov, title, gates, features }),
  }
}

// An empty profile scores every posting alike, so ranking by it would only
// shuffle the feed. Titles count here as well as skills and years: a profile
// naming only a target title is still something to rank against.
export function canRank(profile) {
  const p = normalizeProfile(profile)
  return p.skills.length > 0 || p.years !== null || titleTokens(p.titles.join(' ')).length > 0
}
