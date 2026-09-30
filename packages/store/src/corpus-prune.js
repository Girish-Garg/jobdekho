import { outOfDate } from '@jobdekho/core/freshness.js'

// The corpus without the postings too old to be of use (see core's
// freshness.js) or closed (corpus-closure.js), except the ones a person has
// done something with (corpus-keep.js), which stay with their closedAt. Run
// as part of the one write a scrape makes, so the file on disk never holds
// what the feed would only hide, and a scrape that fails leaves the last good
// corpus as it was.
export function pruneRows(rowsById, { keep = new Set(), now = Date.now() } = {}) {
  const next = new Map()
  let removed = 0
  for (const [id, row] of rowsById) {
    if (!keep.has(id) && (row.closedAt || outOfDate(row, now))) removed += 1
    else next.set(id, row)
  }
  return { rows: next, removed }
}
