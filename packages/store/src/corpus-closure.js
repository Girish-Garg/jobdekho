// Closing postings that are gone, on evidence a run gathered (see the
// scraper's closure-turn.js): a complete source (one that lists everything it
// has) that stopped listing one on two clean runs in a row, a deadline the
// board published that has passed, or a check of the posting's own link that
// found the job gone. Postings used to linger in the feed for 21 days after
// their links died, and in the store for 60.
//
// A sighting (listed again, skipped as known, found live) clears the count,
// and reopens a posting closed by mistake.
export const MISSES_TO_CLOSE = 2

function reopened(row) {
  const { missedRuns, closedAt, ...rest } = row
  return rest
}

// `sighted`, `missed` and `gone` are posting ids; `now` is an ISO time.
// Changes `rows` (a Map by id, the write's own copy) in place and says how many
// postings this call closed.
export function applyClosure(rows, { sighted = [], missed = [], gone = [] } = {}, now) {
  const seen = new Set(sighted)
  let closed = 0
  const close = (id, row, extra = {}) => {
    rows.set(id, { ...row, ...extra, closedAt: now })
    closed += 1
  }
  for (const id of seen) {
    const row = rows.get(id)
    if (row && (row.missedRuns || row.closedAt)) rows.set(id, reopened(row))
  }
  for (const id of missed) {
    const row = rows.get(id)
    if (!row || row.closedAt || seen.has(id)) continue
    const missedRuns = (row.missedRuns ?? 0) + 1
    if (missedRuns >= MISSES_TO_CLOSE) close(id, row, { missedRuns })
    else rows.set(id, { ...row, missedRuns })
  }
  for (const id of gone) {
    const row = rows.get(id)
    if (row && !row.closedAt && !seen.has(id)) close(id, row)
  }
  // A published deadline (Unstop's registration end, Greenhouse's application
  // deadline) closes a posting on its own, but not one listed again today.
  for (const [id, row] of rows) {
    if (row.closedAt || seen.has(id) || !row.closesAt) continue
    if (Date.parse(row.closesAt) < Date.parse(now)) close(id, row)
  }
  return closed
}
