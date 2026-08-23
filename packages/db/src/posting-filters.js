import { eq, or, ilike, inArray, notInArray, isNull, gte, sql } from 'drizzle-orm'
import { DEGREES, degreeRank } from '@jobdekho/core/degree.js'
import { expandQuery } from '@jobdekho/core/families.js'
import { postings, userPostings } from './schema.js'
import { measureConditions } from './posting-measures.js'

const DEFAULT_LIMIT = 500
const MAX_LIMIT = 1000

// Rows scraped before the taxonomy landed carry NULL, and read as these.
const NULL_LEVEL = 'mid'
const NULL_DEGREE = 'none'
const NULL_WORK_MODE = 'onsite'

export function escapeLike(s) {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

export function clampPage({ limit, offset } = {}) {
  const l = Math.trunc(Number(limit))
  const o = Math.trunc(Number(offset))
  return {
    limit: Number.isFinite(l) && l > 0 ? Math.min(l, MAX_LIMIT) : DEFAULT_LIMIT,
    offset: Number.isFinite(o) && o > 0 ? o : 0,
  }
}

// Rank comparison has no SQL equivalent, so the reachable set is expanded here.
export function allowedDegrees(maxDegree) {
  const ceiling = degreeRank(maxDegree)
  return DEGREES.filter((d) => degreeRank(d) <= ceiling)
}

function inSetOrNull(column, allowed, nullReads) {
  const set = inArray(column, allowed)
  return allowed.includes(nullReads) ? or(set, isNull(column)) : set
}

// Status has to be matched in SQL rather than after LIMIT, or a paged read
// would drop actioned rows that sit outside the first page. A null status is
// "not yet actioned", which the left join leaves NULL.
function statusCondition(status) {
  return status === null ? isNull(userPostings.status) : eq(userPostings.status, status)
}

// A posting the adapters have stopped returning has almost certainly closed.
// Rows predating the column read as NULL and stay visible: absent evidence of
// freshness is not evidence of staleness.
export const STALE_AFTER_DAYS = 21

export function freshCondition(days = STALE_AFTER_DAYS) {
  return or(
    isNull(postings.lastSeenAt),
    gte(postings.lastSeenAt, sql`now() - make_interval(days => ${days})`),
  )
}

// Expansion applies to the TITLE only. The company is always matched
// literally, or searching "web dev" would start hitting a firm called Frontend.
export function searchCondition(q) {
  const literal = `%${escapeLike(q)}%`
  const expanded = expandQuery(q)
  const titles = expanded
    ? expanded.map((t) => ilike(postings.title, `%${escapeLike(t)}%`))
    : [ilike(postings.title, literal)]
  return or(...titles, ilike(postings.company, literal))
}

export function postingConditions(opts = {}) {
  const { source, sources, excludedSources, q, levels, maxDegree, workModes, status } = opts
  const conditions = []
  if (status !== undefined) conditions.push(statusCondition(status))
  // `sources` is the multi-select; `source` is the older single-value param.
  if (sources?.length) conditions.push(inArray(postings.source, sources))
  else if (source) conditions.push(eq(postings.source, source))
  // Exclusion is stored rather than inclusion so a board added to the config
  // later shows up automatically instead of being silently left out.
  if (excludedSources?.length) conditions.push(notInArray(postings.source, excludedSources))
  if (workModes?.length) conditions.push(inSetOrNull(postings.workMode, workModes, NULL_WORK_MODE))
  conditions.push(...measureConditions(opts))
  if (!opts.includeStale) conditions.push(freshCondition())
  if (q) conditions.push(searchCondition(q))
  if (levels?.length) conditions.push(inSetOrNull(postings.level, levels, NULL_LEVEL))
  if (maxDegree) {
    conditions.push(inSetOrNull(postings.degreeMin, allowedDegrees(maxDegree), NULL_DEGREE))
  }
  return conditions
}
