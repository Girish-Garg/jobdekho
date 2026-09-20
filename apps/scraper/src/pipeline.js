import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'
import { dedupe } from '@jobdekho/core/dedupe.js'
import { getExistingIds, upsertPostings, recordRun } from '@jobdekho/store/queries.js'

const DEFAULT_PORTS = { getExistingIds, upsertPostings, recordRun }

// rules is config/filters.json, the scraper's own relevance floor: what
// counts as worth keeping at all, independent of anyone's saved feed filter.
export async function runPipeline({ items, results }, { db, rules, runId, ports = DEFAULT_PORTS }) {
  const normalized = items.map(({ source, raw }) => normalize(raw, source))
  const relevant = normalized.filter((p) => filter(p, rules))
  const existing = await ports.getExistingIds(db, relevant.map((p) => p.id))
  const { all, fresh } = dedupe(relevant, existing)
  await ports.upsertPostings(db, all)
  await ports.recordRun(db, { id: runId, sourceResults: results, newCount: fresh.length })
  return { total: all.length, fresh: fresh.length, freshPostings: fresh }
}
