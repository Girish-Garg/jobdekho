import { degreeRank } from './degree.js'
import { levelRank, LEVELS } from './level.js'

// Each dimension answers the same question on the same scale: how well does
// this posting satisfy this part of the profile, from 0 to 1. Keeping them
// normalised is what lets an incomplete profile still produce an honest score,
// because the composer can divide by only the dimensions it actually has.

// A skill named in the title is what the role IS. The same word in the body is
// usually context ("our stack includes React"), so it counts, but far less.
export const TITLE_CREDIT = 1
export const BODY_CREDIT = 0.4

// Matching "kubernetes" says far more than matching "python", which appears in
// a third of the corpus. Rarity is measured against the postings actually
// stored rather than a general-language table, because this corpus is entirely
// tech roles and a word that is rare in English can be ubiquitous here. The
// +1s keep an unseen skill finite, and the floor of 1 keeps every skill worth
// something so a common one is never free to match.
export function idfWeight(docFreq, totalDocs) {
  if (!totalDocs) return 1
  return Math.log((totalDocs + 1) / ((docFreq || 0) + 1)) + 1
}

export function idfWeights(docFreq = {}, totalDocs = 0) {
  return Object.fromEntries(
    Object.entries(docFreq).map(([skill, df]) => [skill, idfWeight(df, totalDocs)]),
  )
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Boundaries only on edges that are word characters, so "c++" still matches
// "C++ Developer" and ".net" still matches "ASP.NET". The SQL mirror in
// packages/db reads this same function so the two cannot disagree.
export function skillPatternSource(skill, lead, tail) {
  return (/^\w/.test(skill) ? lead : '') + escapeRe(skill) + (/\w$/.test(skill) ? tail : '')
}

export function skillRegex(skill) {
  return new RegExp(skillPatternSource(skill, '(?<!\\w)', '(?!\\w)'))
}

// Seniority words are dropped: level is scored as its own dimension, so
// leaving "senior" in would let one signal count twice. Rank numerals go for
// the same reason. Single characters are noise once those are gone.
const TITLE_STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'for', 'in', 'at', 'to', 'with', 'on',
  'senior', 'junior', 'jr', 'sr', 'lead', 'staff', 'principal', 'associate',
  'intern', 'internship', 'trainee', 'i', 'ii', 'iii', 'iv', 'v',
])

export function titleTokens(text) {
  const found = String(text || '').toLowerCase().match(/[a-z0-9+#.]+/g) || []
  return [...new Set(found.filter((t) => t.length > 1 && !TITLE_STOP.has(t)))]
}

// The best single match, not the average: someone listing three target titles
// is naming alternatives, and being a perfect fit for one of them is not made
// worse by the other two.
export function titleFit(postingTitle, titles) {
  const hay = new Set(titleTokens(postingTitle))
  let best = 0
  for (const wanted of titles) {
    const tokens = titleTokens(wanted)
    if (!tokens.length) continue
    const hits = tokens.filter((t) => hay.has(t)).length
    best = Math.max(best, hits / tokens.length)
  }
  return best
}

// One rung out is a real candidate, two is a stretch, three is a different
// job. The curve is steep rather than linear because the cost of being wrong
// about seniority grows faster than the distance does.
const LEVEL_BY_GAP = [1, 0.5, 0.2, 0]

export function levelFit(level, wanted) {
  if (!wanted.length) return 0
  const at = levelRank(level || 'mid')
  const gap = Math.min(...wanted.map((w) => Math.abs(at - levelRank(w))))
  return LEVEL_BY_GAP[Math.min(gap, LEVEL_BY_GAP.length - 1)]
}

// Every rung's level fit, so the SQL mirror can emit one lookup CASE instead
// of reimplementing the distance curve.
export function levelFitTable(wanted) {
  return Object.fromEntries(LEVELS.map((l) => [l, levelFit(l, wanted)]))
}

export function degreeFit(degreeMin, held) {
  return degreeRank(degreeMin || 'none') <= degreeRank(held) ? 1 : 0
}
