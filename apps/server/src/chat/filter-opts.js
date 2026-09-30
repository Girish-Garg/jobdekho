import { parseLevels, parseWorkModes, parseMaxDegree, parseMinFit, parseSources } from '../api/postings.js'

// Turns the feed's own filter-bar state (see apps/web/src/lib/savedFilters.js
// EMPTY_FILTERS) into the opts listPostingsForUser already knows how to read,
// reusing the exact parsers the real /api/postings route validates a query
// string through - so a chat question about "what is on screen" can never
// disagree with what the screen actually shows. The client sends this shape
// as a pointer to what it is looking at, not as posting data: every row it
// names still comes from the store, never from the request body.
export function toListOpts(filters, sort, profile) {
  const f = filters || {}
  let status
  if (f.status === 'new') status = null
  else if (f.status) status = f.status
  return {
    q: f.q || undefined,
    status,
    sort,
    profile,
    minFit: parseMinFit(f.minFit),
    excludedSources: parseSources((f.excludedSources || []).join(',')),
    levels: parseLevels((f.levels || []).join(',')),
    workModes: parseWorkModes((f.workModes || []).join(',')),
    maxDegree: parseMaxDegree(f.maxDegree),
    minStipend: f.minStipend,
    maxDurationMonths: f.maxMonths,
    maxExperienceYears: f.maxExp,
    includeStale: Boolean(f.includeStale),
    // The same ceiling clampPage enforces on the real feed (see
    // posting-filters.js): high enough that "how many postings match" is an
    // honest count for any real filter, capped so a single chat turn cannot
    // ask the store to hand over an unbounded corpus.
    limit: 1000,
    offset: 0,
  }
}
