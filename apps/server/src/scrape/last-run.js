import { cachedFile } from '@jobdekho/store/cached-file.js'

// The last scrape that completed, as runs.ndjson recorded it, whichever
// process ran it: the CLI and the server's own job both append there (see
// recordRun in the store's queries.js). The browser asks every second or so
// while a refresh runs, and the file gains a line per scrape for good, so
// only its last line is parsed, and only when the file has changed (see the
// store's cached-file.js).
//
// A source the run chose not to read (LinkedIn inside its guard's window,
// see the scraper's linkedin-turn.js) is neither one of its sources nor a
// failure: it is listed apart with its note. Kept out of the count, too, so
// a run offline, in which every source it did try failed, still reads as
// all failed to auto.js, and is tried again within the hour. A source
// resting after repeated failures is left out of `skipped`: Settings lists
// those from the health record instead (see service.js), one line for all.
//
// `closed` and `checked` (how many postings the run found gone, and how
// many links it checked) are there for runs that recorded them.
export function summarizeRun(run) {
  if (!run) return null
  const all = Array.isArray(run.sourceResults) ? run.sourceResults : []
  const results = all.filter((r) => !r.skipped)
  return {
    at: run.startedAt ?? null,
    fresh: run.newCount ?? 0,
    sources: results.length,
    failed: results.filter((r) => !r.ok).map((r) => ({ name: r.name, error: r.error ?? '' })),
    skipped: all.filter((r) => r.skipped && !r.paused).map((r) => ({ name: r.name, note: r.note ?? '' })),
    ...(run.closed == null ? {} : { closed: run.closed, checked: run.checked ?? 0 }),
  }
}

// A last line that does not parse (an edit by hand) reads as no run rather
// than failing every status check until someone finds it. Settings' Adzuna
// card reads the same last line (see adzuna/last-result.js).
export function lastRecord(text) {
  const body = text.trimEnd()
  if (!body) return null
  try {
    return JSON.parse(body.slice(body.lastIndexOf('\n') + 1))
  } catch {
    return null
  }
}

export function lastRunReader(path) {
  const file = cachedFile(path, { parse: (text) => summarizeRun(lastRecord(text)), empty: () => null })
  return () => file.read()
}
