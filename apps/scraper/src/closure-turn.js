import { makeId } from '@jobdekho/core/posting.js'
import { createHttp } from '@jobdekho/sources/http.js'
import { createHostGate } from '@jobdekho/sources/host-gate.js'
import { createRobotsCheck } from '@jobdekho/sources/robots/robots-check.js'
import { checkLinks, LINK_BUDGET } from '@jobdekho/sources/closure/link-check.js'
import { STALE_AFTER_DAYS } from '@jobdekho/store/posting-filters.js'

// After the adapters have run, what the run can tell about postings that are
// gone (the store's corpus-closure.js closes them in the same write):
//   missed: a complete source (one that lists everything it has) came
//     through cleanly and did not list it, nor did anything else see it;
//   gone and live: a check of the posting's own link, for postings no source
//     has shown for a few days, most at risk of going stale first.
const DAY_MS = 24 * 60 * 60 * 1000
export const CHECK_AFTER_DAYS = 3

const iso = (ms) => new Date(ms).toISOString()

// Every posting a source listed this run, kept or not: a posting the filter
// now drops was still listed, so it is not gone.
export function listedIds(items) {
  const ids = new Set()
  for (const { source, raw } of items) {
    if (raw?.externalId != null && raw.externalId !== '') ids.add(makeId(source, String(raw.externalId)))
  }
  return ids
}

// Only a clean run of a complete source counts: one that failed, was skipped,
// or stopped short with a note (a 429 part way) may simply not have got that far.
export function missedIds(results, rows, sighted) {
  const clean = new Set(results.filter((r) => r.complete && r.ok && !r.note && !r.skipped).map((r) => r.name))
  return rows.filter((row) => clean.has(row.source) && !row.closedAt && !sighted.has(row.id)).map((row) => row.id)
}

export function linkCandidates(rows, skip, nowMs) {
  const unseenSince = iso(nowMs - CHECK_AFTER_DAYS * DAY_MS)
  const visibleFrom = iso(nowMs - STALE_AFTER_DAYS * DAY_MS)
  return rows
    .filter((row) => !row.closedAt && !skip.has(row.id) && row.lastSeenAt)
    .filter((row) => row.lastSeenAt <= unseenSince && row.lastSeenAt >= visibleFrom)
    .sort((a, b) => (a.lastSeenAt < b.lastSeenAt ? -1 : a.lastSeenAt > b.lastSeenAt ? 1 : 0))
}

// The check's own requests go one at a time per host, three seconds apart,
// through a gate of their own, and only where robots.txt allows.
export const linkHttp = () => createHttp({ gate: createHostGate({ ruleFor: () => ({ inFlight: 1, gapMs: 3000 }) }) })

// A posting from a company the person blocked (`isBlocked`, see blocked.js)
// is hidden whether it is open or not, so its link is not worth a request.
export async function closureTurn({ db, results, items, seen, nowMs = Date.now(), http = linkHttp(), budget = LINK_BUDGET, isBlocked = () => false }) {
  const rows = db.corpus.rows()
  const listed = listedIds(items)
  const sighted = new Set([...listed, ...seen])
  const missed = missedIds(results, rows, sighted)
  const candidates = linkCandidates(rows.filter((row) => !isBlocked(row)), new Set([...sighted, ...missed]), nowMs)
  const links = candidates.length && budget > 0
    ? await checkLinks(candidates, { http, allowed: createRobotsCheck(http), budget })
    : { gone: [], live: [], checked: 0 }
  return { listed: [...listed], missed, gone: links.gone, live: links.live, checked: links.checked }
}
