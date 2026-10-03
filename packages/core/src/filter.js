import { classifyLevel } from './level.js'
import { degreeRank } from './degree.js'
import { locationOk } from './location.js'
import { measuresOk } from './measure-rules.js'

// An empty or missing list means "no preference", so every level passes.
// `internshipOnly` is the pre-taxonomy spelling of `levels: ['internship']`.
function wantedLevels(rules) {
  if (rules.levels?.length) return rules.levels
  if (rules.internshipOnly) return ['internship']
  return null
}

// A posting that states no level (null) passes a level rule rather than
// being hidden: nothing real is lost to a filter, and the feed lists such
// postings after the confirmed ones, marked (see the store's
// level-unstated.js). One never classified at all is read here.
function levelOk(posting, rules) {
  const wanted = wantedLevels(rules)
  if (!wanted) return true
  const level = posting.level === undefined ? classifyLevel(posting.title, posting.descriptionSnippet) : posting.level
  return level == null || wanted.includes(level)
}

// maxDegree is the highest degree the seeker holds: a master's holder still
// qualifies for bachelor's-floor roles, so this is a ceiling test on the floor.
function degreeOk(posting, rules) {
  if (!rules.maxDegree) return true
  return degreeRank(posting.degreeMin || 'none') <= degreeRank(rules.maxDegree)
}

// An unstated work mode is no chip and no claim, but a filter still has to
// place it: most postings that name only a city are office jobs, so it
// passes an Onsite filter, while Remote and Hybrid take only what says so.
function workModeOk(posting, rules) {
  if (!rules.workModes?.length) return true
  return rules.workModes.includes(posting.workMode || 'onsite')
}

function sourceOk(posting, rules) {
  if (rules.sources?.length && !rules.sources.includes(posting.source)) return false
  return !(rules.excludedSources ?? []).includes(posting.source)
}

// Include keywords search the whole posting, but exclude keywords only the
// title and tags: "marketing" is meant to kill Marketing Intern roles, not a
// Software Engineer whose body mentions the marketing website.
function keywordsOk(posting, rules) {
  const title = `${posting.title} ${posting.tags.join(' ')}`.toLowerCase()
  const hay = `${title} ${posting.descriptionSnippet}`.toLowerCase()
  const include = rules.includeKeywords ?? []
  const exclude = rules.excludeKeywords ?? []
  // An empty include list means "no keyword restriction", matching how an
  // empty `levels` means "any level". Without this a user who clears their
  // keywords would silently match nothing instead of everything.
  if (include.length && !include.some((k) => hay.includes(k.toLowerCase()))) return false
  return !exclude.some((k) => title.includes(k.toLowerCase()))
}

export function filter(posting, rules) {
  // normalize() returns null for rows it cannot identify; dropping them here
  // keeps the pipeline's map-then-filter contract without a crash mid-run.
  if (!posting) return false
  return keywordsOk(posting, rules)
    && levelOk(posting, rules)
    && degreeOk(posting, rules)
    && workModeOk(posting, rules)
    && sourceOk(posting, rules)
    && measuresOk(posting, rules)
    && locationOk(posting.location, rules)
}
