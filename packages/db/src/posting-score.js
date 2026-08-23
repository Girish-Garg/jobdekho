import { sql, inArray } from 'drizzle-orm'
import { WEIGHTS, levelScoreTable, skillPatternSource } from '@jobdekho/core/score.js'
import { normalizeProfile, levelsForYears } from '@jobdekho/core/profile.js'
import { postings } from './schema.js'
import { allowedDegrees } from './posting-filters.js'

// Mirrors scorePosting() in @jobdekho/core/score.js. It exists as SQL because
// ranking has to happen across the whole matching set before LIMIT, exactly
// like the sort does. The JS version stays the source of truth for the weights
// and for the explanation shown on a card.
//
// posting-score.test.js covers what it can without a live database: that the
// WEIGHTS and levelScoreTable values are read from core rather than copied
// here, that one CASE branch is emitted per profile skill, that canRank gates
// an empty profile, and that a skill's pattern comes from core. It does NOT
// verify that this SQL and scorePosting() produce the same score on a real
// row - that equivalence needs a live database and a fake connection would
// only prove the mock behaves as scripted, not that the two scorers agree, so
// it stays unverified until someone runs it against real data.
export function scoreColumn(profile) {
  const p = normalizeProfile(profile)
  const parts = []

  // One CASE per skill, title before body, so a skill in both counts once at
  // the higher weight rather than twice.
  // ~* rather than ILIKE: a substring match let the skill "c" score every
  // posting and "java" claim JavaScript roles. \y is Postgres's word boundary,
  // and skillPatternSource decides which edges get one so that "c++" and
  // ".net" still match, exactly as the JS scorer does.
  for (const skill of p.skills) {
    const pattern = skillPatternSource(skill, '\\y', '\\y')
    parts.push(sql`case
      when ${postings.title} ~* ${pattern} then ${WEIGHTS.titleSkill}
      when ${postings.descriptionSnippet} ~* ${pattern} then ${WEIGHTS.bodySkill}
      else 0 end`)
  }

  // A lookup CASE over the six rungs, so the distance arithmetic lives in one
  // place (levelScoreTable) rather than being reimplemented in SQL.
  const levels = levelsForYears(p.years)
  if (levels.length) {
    const table = levelScoreTable(levels)
    const branches = Object.entries(table)
      .map(([level, points]) => sql`when ${level} then ${points}`)
    parts.push(sql.join([
      sql`case coalesce(${postings.level}, 'mid')`, ...branches, sql`else 0 end`,
    ], sql` `))
  }

  const reachable = inArray(sql`coalesce(${postings.degreeMin}, 'none')`, allowedDegrees(p.degree))
  parts.push(sql`case when ${reachable} then ${WEIGHTS.degreeFit} else 0 end`)

  return sql.join(parts, sql` + `)
}

// An empty profile scores everything identically, so "Recommended" would just
// shuffle the feed. The caller uses this to fall back to the normal ordering.
export function canRank(profile) {
  const p = normalizeProfile(profile)
  return p.skills.length > 0 || p.years !== null
}
