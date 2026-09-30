import { randomUUID } from 'node:crypto'
import { createHttp } from '@jobdekho/sources/http.js'
import { buildAdapters } from '@jobdekho/sources/registry.js'
import { readScrapeConfig } from './config.js'
import { runAdapters } from './runner.js'
import { runPipeline } from './pipeline.js'

// One scrape, start to finish: every source the config lists, fetched through
// the bounded pool, then the pipeline's single write into `db`. The CLI
// (index.js) and the server's refresh job (apps/server/src/scrape/) both run
// this, so a refresh started from the app is the same scrape `npm run
// scrape` does rather than a second copy of it that could drift.
//
// onProgress({ done, total, current }) hears once before the first fetch,
// with nothing done, and again as each source settles, `current` naming the
// one that just did. `config`, `adapters` and `http` default to the real
// thing; tests pass their own, so no test ever reaches the network.
export async function runScrape({
  db, config = readScrapeConfig(), adapters = buildAdapters(config.companies), http = createHttp(), onProgress = () => {},
}) {
  const total = adapters.length
  onProgress({ done: 0, total, current: null })
  const ran = await runAdapters(adapters, http, {
    onResult: (result, { done }) => onProgress({ done, total, current: result.name }),
  })
  const summary = await runPipeline(ran, { db, rules: config.rules, runId: randomUUID() })
  return { ...summary, results: ran.results }
}
