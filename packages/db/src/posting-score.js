import { sql, inArray } from 'drizzle-orm'
import { dimensionWeights, levelFitTable } from '@jobdekho/core/score.js'
import {
  TITLE_CREDIT, BODY_CREDIT, skillPatternSource, titleTokens, stemToken,
} from '@jobdekho/core/fit-dimensions.js'
import { HALF_MATCH } from '@jobdekho/core/skill-fit.js'
import { normalizeProfile, levelsForYears } from '@jobdekho/core/profile.js'
import { postings } from './schema.js'
import { allowedDegrees } from './posting-filters.js'

// Core owns the rule for what is rankable; re-exported so callers cannot end
// up gating on a different answer than the one scorePosting() was built for.
export { canRank } from '@jobdekho/core/score.js'

// Core scores against descriptionText and falls back to the snippet for rows
// stored before the column existed, so the SQL coalesces the same way.
const body = sql`coalesce(${postings.descriptionText}, ${postings.descriptionSnippet})`

// ~* rather than ILIKE: a substring match let the skill "c" score every
// posting and "java" claim JavaScript roles. \y is Postgres's word boundary,
// and skillPatternSource decides which edges get one so that "c++" and ".net"
// still match, exactly as the JS scorer does. The ::float8 casts keep Postgres
// from resolving the fractional credits as integers and truncating them.
function skillTerm(skills, idf) {
  const cases = skills.map((skill) => {
    const pattern = skillPatternSource(skill, '\\y', '\\y')
    const weight = idf[skill] ?? 1
    return sql`case
      when ${postings.title} ~* ${pattern} then ${weight * TITLE_CREDIT}::float8
      when ${body} ~* ${pattern} then ${weight * BODY_CREDIT}::float8
      else 0 end`
  })
  // m / (m + HALF_MATCH), the saturating curve skillFit() uses. Dividing by
  // every listed skill instead would ask whether the job uses everything the
  // candidate knows, which capped a real 25 skill profile near 60 on every
  // posting it could see.
  const earned = sql`(${sql.join(cases, sql` + `)})`
  return sql`${earned} / (${earned} + ${HALF_MATCH}::float8)`
}

// GREATEST mirrors titleFit()'s max: three target titles are alternatives,
// and the best one decides. Token counts are JS constants, so each option is
// a sum of per-token hits over that title's own token total.
//
// Each token is stemmed and matched with an OPENING boundary only. That is
// the SQL spelling of titleFit()'s prefix test: \yengin matches "engineer"
// and "engineering" alike, which is why the stem is compared as a prefix on
// both sides rather than as an equal string.
function titleTerm(titles) {
  const options = titles.map((wanted) => {
    const tokens = titleTokens(wanted).map(stemToken)
    if (!tokens.length) return null
    const hits = tokens.map((stem) =>
      sql`case when ${postings.title} ~* ${skillPatternSource(stem, '\\y', '')} then 1 else 0 end`)
    return sql`(${sql.join(hits, sql` + `)}) / ${tokens.length}::float8`
  }).filter(Boolean)
  if (!options.length) return null
  return options.length === 1 ? options[0] : sql`greatest(${sql.join(options, sql`, `)})`
}

// A lookup CASE over the six rungs, so the distance arithmetic lives in one
// place (levelFitTable) rather than being reimplemented in SQL.
function levelTerm(years) {
  const rungs = Object.entries(levelFitTable(levelsForYears(years)))
    .map(([level, fit]) => sql`when ${level} then ${fit}::float8`)
  return sql.join([sql`case coalesce(${postings.level}, 'mid')`, ...rungs, sql`else 0 end`], sql` `)
}

function degreeTerm(degree) {
  const reachable = inArray(sql`coalesce(${postings.degreeMin}, 'none')`, allowedDegrees(degree))
  return sql`case when ${reachable} then 1 else 0 end`
}

// Mirrors scorePosting() in @jobdekho/core/score.js: the same four 0-1
// dimensions, weighted by dimensionWeights() and composed to the same rounded
// 0-100 percentage. It exists as SQL because ranking and the minFit floor have
// to apply across the whole matching set before LIMIT. The JS version stays
// the source of truth: every weight, credit, rung value and denominator here
// is read from core at build time, never restated.
//
// posting-score.test.js covers what it can without a live database: that the
// constants come from core rather than copies here, that one CASE is emitted
// per skill and per title token, that patterns arrive escaped and boundary-
// marked exactly as core builds them, and that the score divides by the
// profile's dimension total. It does NOT verify that this SQL and
// scorePosting() produce the same number on a real row - that equivalence
// needs a live database, and a fake connection would only prove the mock
// behaves as scripted, so it stays unverified until someone runs it on real data.
export function scoreColumn(profile, idf = {}) {
  const p = normalizeProfile(profile)
  const w = dimensionWeights(p)
  const parts = []
  if (w.skills) parts.push(sql`${w.skills} * ${skillTerm(p.skills, idf)}`)
  const titled = w.titles ? titleTerm(p.titles) : null
  if (titled) parts.push(sql`${w.titles} * ${titled}`)
  if (w.level) parts.push(sql`${w.level} * ${levelTerm(p.years)}`)
  parts.push(sql`${w.degree} * ${degreeTerm(p.degree)}`)
  return sql`round(100 * (${sql.join(parts, sql` + `)}) / ${w.total}::float8)`
}
