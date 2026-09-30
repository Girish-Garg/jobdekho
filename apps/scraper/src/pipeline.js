import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'
import { dedupe } from '@jobdekho/core/dedupe.js'
import { postedTooLongAgo } from '@jobdekho/core/freshness.js'
import { getExistingIds, upsertPostings, recordRun } from '@jobdekho/store/queries.js'

const DEFAULT_PORTS = { getExistingIds, upsertPostings, recordRun }

// rules is config/filters.json, the scraper's own relevance floor: what
// counts as worth keeping at all, independent of anyone's saved feed filter.
//
// A company's careers board sends every open job in one reply, whatever its
// date, so the fetch cannot skip the old ones; they are dropped here instead
// (see core's freshness.js), and the store's write drops what has aged out
// since (store/corpus-prune.js). Both counts come back for the run's summary.
export async function runPipeline({ items, results }, { db, rules, runId, ports = DEFAULT_PORTS, now = Date.now() }) {
  const normalized = items.map(({ source, raw }) => normalize(raw, source))
  const relevant = normalized.filter((p) => filter(p, rules))
  const recent = relevant.filter((p) => !postedTooLongAgo(p, now))
  const existing = await ports.getExistingIds(db, recent.map((p) => p.id))
  const { all, fresh } = dedupe(recent, existing)
  const { removed = 0 } = (await ports.upsertPostings(db, all, now)) ?? {}
  await ports.recordRun(db, { id: runId, sourceResults: results, newCount: fresh.length })
  return { total: all.length, fresh: fresh.length, freshPostings: fresh, tooOld: relevant.length - recent.length, removed }
}
