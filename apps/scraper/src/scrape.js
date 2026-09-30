import { randomUUID } from 'node:crypto'
import { createHttp } from '@jobdekho/sources/http.js'
import { createHostGate } from '@jobdekho/sources/host-gate.js'
import { resolveAdzunaKeys } from '@jobdekho/store/adzuna-keys.js'
import { readScrapeConfig } from './config.js'
import { scrapeAdapters } from './sources.js'
import { runAdapters } from './runner.js'
import { runPipeline } from './pipeline.js'
import { startLinkedinTurn } from './linkedin-turn.js'
import { startHealthTurn } from './health-turn.js'
import { createRunContext } from './run-context.js'
import { openMemo } from './source-memo.js'
import { closureTurn, linkHttp } from './closure-turn.js'

// A failure worth a second try (see retry.js) gets it after this pause.
const RETRY_DELAY_MS = 2000

// One scrape, start to finish: every source the config lists, fetched through
// the bounded pool and the per-host gate, then the pipeline's single write
// into `db`. The CLI (index.js) and the server's refresh job
// (apps/server/src/scrape/) both run this, so a refresh started from the app
// is the same scrape `npm run scrape` does rather than a second copy of it.
//
// `userId` is whose Adzuna key to look for in `db`, with ADZUNA_APP_ID and
// ADZUNA_APP_KEY from `env` as the fallback (see sources.js), and whose
// "Include LinkedIn" switch to obey (see linkedin-turn.js).
//
// Around the fetch: sources resting after repeated failures are left out
// (health-turn.js); what adapters may ask of the run and what the run learns
// from them (run-context.js, source-memo.js); and which stored postings are
// gone (closure-turn.js), closed in the same write.
//
// onProgress({ done, total, current }) hears once before the first fetch,
// with nothing done, and again as each source settles. `config`, `adapters`,
// `http`, `checkHttp` and `now` default to the real thing; tests pass their
// own, so no test ever reaches the network.
export async function runScrape({
  db, userId = null, env = process.env, config = readScrapeConfig(),
  adzunaKeys = resolveAdzunaKeys(db, userId, env), adapters = scrapeAdapters(config.companies, adzunaKeys),
  http = createHttp({ gate: createHostGate() }), checkHttp = linkHttp(), retryDelayMs = RETRY_DELAY_MS,
  onProgress = () => {}, now = Date.now,
}) {
  const health = startHealthTurn({ db, adapters, now })
  const linkedin = startLinkedinTurn({ db, userId, adapters: health.adapters, now })
  const total = linkedin.adapters.length
  onProgress({ done: 0, total, current: null })
  const memo = openMemo(db, config.rules)
  const run = createRunContext({ db, rules: config.rules, memo, now })
  const ran = await runAdapters(linkedin.adapters, http, {
    context: { ...run.context, ...linkedin.context },
    delayMs: retryDelayMs,
    onResult: (result, { done }) => onProgress({ done, total, current: result.name }),
  })
  const marked = ran.results.map((r) => (run.unchanged.has(r.name) ? { ...r, unchanged: true } : r))
  const results = health.settle(linkedin.settle(marked))
  const closure = await closureTurn({ db, results, items: ran.items, seen: run.seen, nowMs: now(), http: checkHttp })
  const summary = await runPipeline({ items: ran.items, results, seen: [...run.seen], closure }, { db, rules: config.rules, runId: randomUUID(), now: now() })
  memo.commit(new Set(results.filter((r) => r.ok && !r.skipped).map((r) => r.name)), run.settle)
  health.record({ results, listedBy: (name) => run.knownBy.get(name) ?? 0, fresh: summary.freshPostings })
  return { ...summary, results }
}
