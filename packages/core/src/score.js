import { degreeRank } from './degree.js'
import { LEVELS, levelRank } from './level.js'
import { normalizeProfile, levelsForYears } from './profile.js'

// A skill in the title is evidence about the role. The same word in the body
// is often boilerplate ("we use React somewhere"), so it counts for far less.
//
// levelGap is a penalty, not a missing bonus. With a bonus alone, a Lead role
// matching two skills outscored a well-suited entry role matching one, and the
// feed recommended jobs a one-year candidate cannot get. Being wrong about
// seniority has to cost, and cost more the further off it is.
export const WEIGHTS = { titleSkill: 8, bodySkill: 2, levelFit: 6, levelGap: -5, degreeFit: 4 }

// Distance from the nearest level the seeker suits, in rungs.
export function levelDistance(level, wanted) {
  if (!wanted.length) return 0
  const at = levelRank(level || 'mid')
  return Math.min(...wanted.map((w) => Math.abs(at - levelRank(w))))
}

export function levelScore(level, wanted) {
  if (!wanted.length) return 0
  const gap = levelDistance(level, wanted)
  return gap === 0 ? WEIGHTS.levelFit : WEIGHTS.levelGap * gap
}

// Every rung's score for a given profile, so SQL can emit one lookup CASE
// instead of reimplementing the distance arithmetic.
export function levelScoreTable(wanted) {
  return Object.fromEntries(LEVELS.map((l) => [l, levelScore(l, wanted)]))
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Bare substring matching let the skill "c" score every posting and "java"
// claim JavaScript roles, so a skill only counts at word boundaries. \b fails
// on skills that start or end in symbols (c++, .net), so the boundary is only
// asserted on the edges that are word characters: ".net" still hits "asp.net"
// and "c++" still hits "C++ Developer".
function skillPattern(skill) {
  const lead = /^\w/.test(skill) ? '(?<!\\w)' : ''
  const tail = /\w$/.test(skill) ? '(?!\\w)' : ''
  return new RegExp(lead + escapeRe(skill) + tail)
}

// This is the single source of truth for the ranking. The SQL in
// packages/db/src/posting-score.js mirrors it so that sorting can happen before
// LIMIT, and an integration test asserts the two agree on real rows.
// NOTE: that SQL still matches skills with ilike '%skill%', so it has not yet
// picked up the word-boundary treatment above - the two drift on short skills
// until it does.
export function scorePosting(posting, profile) {
  const p = normalizeProfile(profile)
  const title = String(posting.title || '').toLowerCase()
  const body = String(posting.descriptionSnippet || '').toLowerCase()

  const patterns = p.skills.map((s) => [s, skillPattern(s)])
  const inTitle = patterns.filter(([, re]) => re.test(title)).map(([s]) => s)
  const inBody = patterns.filter(([, re]) => !re.test(title) && re.test(body)).map(([s]) => s)

  const wanted = levelsForYears(p.years)
  const level = levelScore(posting.level || 'mid', wanted)
  const reachable = degreeRank(posting.degreeMin || 'none') <= degreeRank(p.degree)

  const score = inTitle.length * WEIGHTS.titleSkill
    + inBody.length * WEIGHTS.bodySkill
    + level
    + (reachable ? WEIGHTS.degreeFit : 0)

  return {
    score, matched: inTitle, mentioned: inBody, reachable,
    levelFit: level > 0,
    levelGap: levelDistance(posting.level || 'mid', wanted),
  }
}

// Why a posting was recommended, in the user's words rather than a number. An
// opaque score is not trustworthy enough to sort a job hunt by.
export function explainScore(posting, profile) {
  const { matched, mentioned, levelFit, levelGap, reachable, score } = scorePosting(posting, profile)
  const reasons = []
  if (matched.length) reasons.push(`matches ${matched.join(', ')}`)
  else if (mentioned.length) reasons.push(`mentions ${mentioned.join(', ')}`)
  if (levelFit) reasons.push('suits your experience')
  else if (levelGap > 1) reasons.push('well outside your experience')
  if (!reachable) reasons.push('needs a higher degree than you listed')
  return { score, reasons }
}
