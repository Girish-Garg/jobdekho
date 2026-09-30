import { cachedFile } from '@jobdekho/store/cached-file.js'
import { lastRecord } from '../scrape/last-run.js'

// How Adzuna did in the most recent completed scrape, whoever ran it (this
// server or `npm run scrape`): { at, ok, count, error }, or null when that
// run had no Adzuna in it, as a run before any key was saved has not. Only
// the last run counts: an older result would claim a key works that has
// since been removed or replaced.
export function adzunaResult(run) {
  const results = Array.isArray(run?.sourceResults) ? run.sourceResults : []
  const hit = results.find((r) => String(r?.name ?? '').startsWith('adzuna:'))
  if (!hit) return null
  return {
    at: run.startedAt ?? null,
    ok: Boolean(hit.ok),
    count: Number.isFinite(hit.count) ? hit.count : 0,
    error: hit.ok ? null : String(hit.error ?? ''),
  }
}

// Parsed only when the file has changed, and only its last line, the way
// scrape/last-run.js reads it for the refresh card.
export function adzunaResultReader(path) {
  const file = cachedFile(path, { parse: (text) => adzunaResult(lastRecord(text)), empty: () => null })
  return () => file.read()
}
