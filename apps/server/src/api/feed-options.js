import { LEVELS } from '@jobdekho/core/level.js'
import { DEGREES } from '@jobdekho/core/degree.js'
import { WORK_MODES } from '@jobdekho/core/work-mode.js'

// Unknown values are dropped rather than rejected: a stale bookmarked URL
// should still return results.
function parseEnum(raw, allowed) {
  if (typeof raw !== 'string') return undefined
  const picked = raw.split(',').map((s) => s.trim()).filter((s) => allowed.includes(s))
  return picked.length ? picked : undefined
}

export const parseLevels = (raw) => parseEnum(raw, LEVELS)
export const parseWorkModes = (raw) => parseEnum(raw, WORK_MODES)

export function parseMaxDegree(raw) {
  return DEGREES.includes(raw) ? raw : undefined
}

// Free text, so it cannot be validated against a list the way levels can. It is
// only ever used as a bound parameter, never interpolated.
export function parseSources(raw) {
  if (typeof raw !== 'string') return undefined
  const names = raw.split(',').map((s) => s.trim()).filter(Boolean)
  return names.length ? names : undefined
}

// Company names as a JSON body carries them (the chat's copy of the filter
// bar, see chat/filter-opts.js), rather than as a query string's list.
export function parseCompanyList(list) {
  const names = (Array.isArray(list) ? list : []).filter((n) => typeof n === 'string' && n.trim()).map((n) => n.trim())
  return names.length ? names : undefined
}

export function parseCount(raw) {
  if (raw === undefined || raw === null || raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : undefined
}

// The floor is only meaningful on the fit's own 0-100 scale; anything outside
// it is a mangled or stale URL and is dropped like every other bad enum.
export function parseMinFit(raw) {
  const n = parseCount(raw)
  return n !== undefined && n <= 100 ? n : undefined
}

// What a feed query string asks for, read one way for the feed and for the
// company menu that counts it (see postings.js), so the two cannot disagree
// about which jobs a filter leaves.
export function feedOptions(q) {
  let status
  if (q.status === 'new') status = null
  else if (q.status !== undefined) status = q.status
  return {
    q: q.q, source: q.source, status,
    minFit: parseMinFit(q.minFit),
    sources: parseSources(q.sources),
    excludedSources: parseSources(q.excludedSources),
    // Names, comma-separated. A comma inside a name comes as a space, which
    // changes nothing: its key ignores punctuation (see core's company-key.js).
    companies: parseSources(q.companies),
    levels: parseLevels(q.levels),
    workModes: parseWorkModes(q.workModes),
    maxDegree: parseMaxDegree(q.maxDegree),
    // Left as the strings they arrive as; postingConditions coerces them.
    minStipend: q.minStipend,
    maxDurationMonths: q.maxDurationMonths,
    maxExperienceYears: q.maxExperienceYears,
    includeStale: q.includeStale === 'true',
  }
}
