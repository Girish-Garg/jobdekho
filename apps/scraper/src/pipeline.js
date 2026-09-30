import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'
import { dedupe } from '@jobdekho/core/dedupe.js'
import { postedTooLongAgo } from '@jobdekho/core/freshness.js'
import { getExistingIds, upsertPostings, recordRun } from '@jobdekho/store/queries.js'

const DEFAULT_PORTS = { getExistingIds, upsertPostings, recordRun }

// A deadline the board published (Unstop's registration end, Greenhouse's
// application deadline) rides beside what normalize() makes of the posting,
// for the store's closure rules.
const withDeadline = (posting, raw) => (posting && raw?.closesAt ? { ...posting, closesAt: raw.closesAt } : posting)

// rules is config/filters.json, the scraper's own relevance floor: what
// counts as worth keeping at all, independent of anyone's saved feed filter.
//
// A company's careers board sends every open job in one reply, whatever its
// date, so the fetch cannot skip the old ones; they are dropped here instead
// (see core's freshness.js), and the store's write drops what has aged out
// since (store/corpus-prune.js). Both counts come back for the run's summary.
// `seen` are ids of postings a source listed but skipped as already stored;
// the write moves their lastSeenAt on (see the store's corpus-merge.js).
// `closure` is what closure-turn.js found out about postings that are gone:
// the write closes them, and a posting whose link was found live is seen.
export async function runPipeline({ items, results, seen = [], closure = {} }, { db, rules, runId, ports = DEFAULT_PORTS, now = Date.now() }) {
  const normalized = items.map(({ source, raw }) => withDeadline(normalize(raw, source), raw))
  const relevant = normalized.filter((p) => filter(p, rules))
  const recent = relevant.filter((p) => !postedTooLongAgo(p, now))
  const existing = await ports.getExistingIds(db, recent.map((p) => p.id))
  const { all, fresh } = dedupe(recent, existing)
  const seenIds = [...seen, ...(closure.live ?? [])]
  const { removed = 0, closed = 0 } = (await ports.upsertPostings(db, all, now, seenIds, closure)) ?? {}
  const checked = closure.checked ?? 0
  await ports.recordRun(db, { id: runId, sourceResults: results, newCount: fresh.length, closed, checked })
  return { total: all.length, fresh: fresh.length, freshPostings: fresh, tooOld: relevant.length - recent.length, removed, closed, checked }
}
