import { outOfDate } from '@jobdekho/core/freshness.js'

// The corpus without the postings too old to be of use (see core's
// freshness.js), except the ones a person has done something with
// (corpus-keep.js). Run as part of the one write a scrape makes, so the file
// on disk never holds what the feed would only hide, and a scrape that
// fails leaves the last good corpus as it was.
export function pruneRows(rowsById, { keep = new Set(), now = Date.now() } = {}) {
  const next = new Map()
  let removed = 0
  for (const [id, row] of rowsById) {
    if (!keep.has(id) && outOfDate(row, now)) removed += 1
    else next.set(id, row)
  }
  return { rows: next, removed }
}
