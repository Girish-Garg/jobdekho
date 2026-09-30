import { cachedFile } from '@jobdekho/store/cached-file.js'

// The last scrape that completed, as runs.ndjson recorded it, whichever
// process ran it: the CLI and the server's own job both append there (see
// recordRun in the store's queries.js). The browser asks every second or so
// while a refresh runs, and the file gains a line per scrape for good, so
// only its last line is parsed, and only when the file has changed (see the
// store's cached-file.js).
export function summarizeRun(run) {
  if (!run) return null
  const results = Array.isArray(run.sourceResults) ? run.sourceResults : []
  return {
    at: run.startedAt ?? null,
    fresh: run.newCount ?? 0,
    sources: results.length,
    failed: results.filter((r) => !r.ok).map((r) => ({ name: r.name, error: r.error ?? '' })),
  }
}

// A last line that does not parse (an edit by hand) reads as no run rather
// than failing every status check until someone finds it.
function lastRecord(text) {
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
