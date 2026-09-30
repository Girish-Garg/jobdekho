// What a Workday tenant remembers between runs, through the run's source memo
// (the scraper's source-memo.js): the India facets its filter panel offered,
// and how many postings its India listing held at its last full read. With
// them a quiet tenant costs one request a run instead of six: no facet probe,
// and no pages after the first when that page holds nothing new and the count
// has not moved. Both are read afresh at least weekly.
const DAY_MS = 24 * 60 * 60 * 1000
export const MEMO_DAYS = 7

const iso = (ms) => new Date(ms).toISOString()
const within = (at, nowMs) => Number.isFinite(Date.parse(at)) && nowMs - Date.parse(at) < MEMO_DAYS * DAY_MS

// `facets` is undefined when they must be probed again; null is a tenant with
// no India facet, which searches for "India" as text instead.
export function recallWorkday(context, name, nowMs) {
  const kept = context?.recall?.(name, 'workday')
  if (!kept || typeof kept !== 'object') return null
  return {
    facets: within(kept.facetsAt, nowMs) ? (kept.facets ?? null) : undefined,
    facetsAt: kept.facetsAt ?? null,
    total: within(kept.fullAt, nowMs) && Number.isFinite(kept.total) ? kept.total : null,
    fullAt: kept.fullAt ?? null,
  }
}

// After a full read (no 429 cut it short), what the next run may lean on.
export function keepWorkday(context, name, listed, memo, nowMs) {
  context?.keep?.(name, 'workday', {
    facets: listed.facets ?? null,
    facetsAt: listed.probed || !memo?.facetsAt ? iso(nowMs) : memo.facetsAt,
    total: listed.total,
    fullAt: iso(nowMs),
  })
}
