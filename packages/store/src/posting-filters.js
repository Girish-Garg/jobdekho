import { filter } from '@jobdekho/core/filter.js'
import { expandQuery } from '@jobdekho/core/families.js'
import { companyKey } from '@jobdekho/core/company-key.js'
import { toIso } from './timestamp.js'

const DEFAULT_LIMIT = 500
const MAX_LIMIT = 1000

// Query params arrive as strings. Number.isFinite('1') is false, which
// silently dropped every measure filter instead of applying it, so "Paid only"
// quietly returned unpaid postings.
export function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function clampPage({ limit, offset } = {}) {
  const l = Math.trunc(Number(limit))
  const o = Math.trunc(Number(offset))
  return {
    limit: Number.isFinite(l) && l > 0 ? Math.min(l, MAX_LIMIT) : DEFAULT_LIMIT,
    offset: Number.isFinite(o) && o > 0 ? o : 0,
  }
}

// A posting the adapters have stopped returning has almost certainly closed.
// Rows predating the column carry null and stay visible: absent evidence of
// freshness is not evidence of staleness.
export const STALE_AFTER_DAYS = 21
const DAY_MS = 24 * 60 * 60 * 1000

export function isFresh(row, cutoff) {
  return row.lastSeenAt == null || row.lastSeenAt >= cutoff
}

// Expansion applies to the TITLE only. The company is always matched
// literally, or searching "web dev" would start hitting a firm called Frontend.
// The query is expanded once here, not per row: expandQuery() tests every
// family term, and doing that for each of thousands of rows cost more than
// the search saved by discarding them.
export function searchMatcher(q) {
  const literal = String(q).toLowerCase()
  const terms = (expandQuery(q) ?? [literal]).map((term) => term.toLowerCase())
  return (row) => {
    const title = String(row.title || '').toLowerCase()
    if (terms.some((term) => title.includes(term))) return true
    return String(row.company || '').toLowerCase().includes(literal)
  }
}

// Picked by name and matched by key: the same employer arrives as "PHONEPE
// LIMITED" from one source and "Phonepe" from another (see core's
// company-key.js), and picking it should bring the jobs from both.
export function companyMatcher(names) {
  const keys = new Set((names ?? []).map(companyKey).filter(Boolean))
  return keys.size ? (row) => keys.has(companyKey(row.company)) : null
}

// The rules the feed shares with the alerts (levels, degree, work mode,
// sources, the pay and tenure floors) are core's filter(), the same function
// the scraper runs, so browsing and notifying cannot disagree about what a
// rule means; the SQL used to restate each of them. Only what the feed alone
// needs is wrapped around it. Status is matched here rather than after
// paging, or a paged read would drop actioned rows that sit outside the first
// page; a null status is "not yet actioned". `source` is the older
// single-value param and yields to the `sources` multi-select when both come.
export function postingPredicate(opts, statusOf, now = Date.now()) {
  const cutoff = toIso(now - STALE_AFTER_DAYS * DAY_MS)
  const matchesSearch = opts.q ? searchMatcher(opts.q) : null
  const matchesCompany = companyMatcher(opts.companies)
  return (row) => {
    if (opts.status !== undefined && statusOf(row.id) !== opts.status) return false
    if (!opts.sources?.length && opts.source && row.source !== opts.source) return false
    // A closed posting (see corpus-closure.js) is only still stored because
    // the person did something with it: it leaves the feed but stays in their
    // own lists (a status filter), marked closed, however long ago it was seen.
    const closed = Boolean(row.closedAt)
    if (closed && opts.status === undefined && !opts.includeStale) return false
    if (!closed && !opts.includeStale && !isFresh(row, cutoff)) return false
    if (matchesSearch && !matchesSearch(row)) return false
    if (matchesCompany && !matchesCompany(row)) return false
    return filter(row, opts)
  }
}
