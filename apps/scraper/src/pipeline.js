import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'
import { dedupe } from '@jobdekho/core/dedupe.js'
import { getExistingIds, upsertPostings, recordRun } from '@jobdekho/db/queries.js'
import { formatBatch, chunk } from '@jobdekho/notify/format.js'
import { sendTelegram } from '@jobdekho/notify/telegram.js'

const DEFAULT_PORTS = { getExistingIds, upsertPostings, recordRun, sendTelegram }
const BATCH = 10

export async function runPipeline({ items, results }, { db, rules, telegram, runId, ports = DEFAULT_PORTS }) {
  const normalized = items.map(({ source, raw }) => normalize(raw, source))
  const relevant = normalized.filter((p) => filter(p, rules))
  const existing = await ports.getExistingIds(db, relevant.map((p) => p.id))
  const { all, fresh } = dedupe(relevant, existing)
  await ports.upsertPostings(db, all)
  for (const group of chunk(fresh, BATCH)) await ports.sendTelegram(telegram, formatBatch(group))
  await ports.recordRun(db, { id: runId, sourceResults: results, newCount: fresh.length })
  return { total: all.length, fresh: fresh.length, freshPostings: fresh }
}
