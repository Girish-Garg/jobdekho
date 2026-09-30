import { makeId } from '@jobdekho/core/posting.js'
import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'

const DAY_MS = 24 * 60 * 60 * 1000
const iso = (ms) => new Date(ms).toISOString()

// An ETag older than this is not sent: a full read at least weekly lets a fix
// to an adapter's parsing reach the stored rows, as a refresh always has.
export const ETAG_DAYS = 7

// What an adapter may ask of the run (see scrape.js), and what the run learns
// from the asking. `seen` gathers the ids of postings a source listed without
// sending (the store moves their lastSeenAt on); `knownBy` counts them by
// source, skipped as known or unchanged; `unchanged` names the sources that
// said their listing had not changed. `memo` is the run's source-memo.js.
export function createRunContext({ db, rules, memo, now = Date.now }) {
  const seen = new Set()
  const knownBy = new Map()
  const unchanged = new Set()
  const count = (source) => knownBy.set(source, (knownBy.get(source) ?? 0) + 1)
  const rowsOf = (source) => db.corpus.rows().filter((row) => row.source === source)

  const context = {
    // A posting the store already holds a description for needs no second
    // request, and it was still listed, so it counts as seen.
    known(source, externalId) {
      const id = makeId(source, externalId)
      const hit = Boolean(db.corpus.byId().get(id)?.descriptionText)
      if (hit) {
        seen.add(id)
        count(source)
      }
      return hit
    },
    // A card the relevance filter would drop is never stored, and would
    // otherwise be fetched again on every run.
    wanted: (source, raw) => filter(normalize(raw, source), rules),
    // The source's listing is the one it gave at `since` (a 304 answers for
    // the read its ETag came from). Every posting that read listed counts as
    // seen again. One missing then stays missing, so a complete source can
    // still close it (see closure-turn.js).
    unchanged(source, since = memo.recall(source, 'etag')?.at ?? null) {
      unchanged.add(source)
      for (const row of rowsOf(source)) {
        if (row.closedAt || row.missedRuns) continue
        if (since && String(row.lastSeenAt ?? '') < since) continue
        seen.add(row.id)
        count(source)
      }
    },
    // The ETag of the board's last full read, while it can be trusted: from
    // the same address, less than a week old, and with the postings that read
    // stored still in the store (a deleted corpus must be read again whole).
    etagFor(source, url) {
      const kept = memo.recall(source, 'etag')
      if (!kept?.value || kept.url !== url || !Number.isFinite(kept.stored)) return null
      if (now() - Date.parse(kept.at) > ETAG_DAYS * DAY_MS) return null
      const stored = rowsOf(source).filter((row) => String(row.lastSeenAt ?? '') >= kept.at).length
      return stored >= kept.stored ? kept.value : null
    },
    remember(source, url, value) {
      memo.keep(source, 'etag', { url, value, at: iso(now()) })
    },
    recall: (source, key) => memo.recall(source, key),
    keep: (source, key, value) => memo.keep(source, key, value),
  }
  // What an ETag's read left in the store, counted once the write is in.
  const settle = (source, key, value) => (key === 'etag'
    ? { ...value, stored: rowsOf(source).filter((row) => String(row.lastSeenAt ?? '') >= value.at).length }
    : value)
  return { context, seen, knownBy, unchanged, settle }
}
