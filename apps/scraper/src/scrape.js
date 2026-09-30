import { randomUUID } from 'node:crypto'
import { createHttp } from '@jobdekho/sources/http.js'
import { makeId } from '@jobdekho/core/posting.js'
import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'
import { resolveAdzunaKeys } from '@jobdekho/store/adzuna-keys.js'
import { readScrapeConfig } from './config.js'
import { scrapeAdapters } from './sources.js'
import { runAdapters } from './runner.js'
import { runPipeline } from './pipeline.js'

// One scrape, start to finish: every source the config lists, fetched through
// the bounded pool, then the pipeline's single write into `db`. The CLI
// (index.js) and the server's refresh job (apps/server/src/scrape/) both run
// this, so a refresh started from the app is the same scrape `npm run
// scrape` does rather than a second copy of it that could drift.
//
// `userId` is whose Adzuna key to look for in `db`, with ADZUNA_APP_ID and
// ADZUNA_APP_KEY from `env` as the fallback (see sources.js for how a key
// adds Adzuna to the run). Resolved here, on the shared path, so the CLI and
// the app's refresh cannot disagree about whether Adzuna runs.
//
// onProgress({ done, total, current }) hears once before the first fetch,
// with nothing done, and again as each source settles, `current` naming the
// one that just did. `config`, `adapters` and `http` default to the real
// thing; tests pass their own, so no test ever reaches the network.
export async function runScrape({
  db, userId = null, env = process.env, config = readScrapeConfig(),
  adzunaKeys = resolveAdzunaKeys(db, userId, env), adapters = scrapeAdapters(config.companies, adzunaKeys),
  http = createHttp(), onProgress = () => {},
}) {
  const total = adapters.length
  onProgress({ done: 0, total, current: null })
  // What an adapter may skip fetching a second page for (LinkedIn's job
  // views): a posting the store already holds a description for, and a card
  // the relevance filter would drop anyway, which is never stored and would
  // otherwise be fetched again on every run.
  const context = {
    known: (source, externalId) => Boolean(db.corpus.byId().get(makeId(source, externalId))?.descriptionText),
    wanted: (source, raw) => filter(normalize(raw, source), config.rules),
  }
  const ran = await runAdapters(adapters, http, {
    context,
    onResult: (result, { done }) => onProgress({ done, total, current: result.name }),
  })
  const summary = await runPipeline(ran, { db, rules: config.rules, runId: randomUUID() })
  return { ...summary, results: ran.results }
}
