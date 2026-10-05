// The scrape the server runs: the scraper's own runScrape (apps/scraper/src/
// scrape.js), reading the same config files the CLI reads, writing into the
// store this server holds, reduced to what the browser is shown of it.
//
// Imported on the first refresh rather than at startup: the source adapters
// bring an HTML parser nothing else in the server uses, and every test that
// builds the app would load it for nothing.
const importScraper = () => import('@jobdekho/scraper/scrape.js')

const UNREAD = 'A posting could not be read and was left out of this refresh'

// `userId` is whose Adzuna key and LinkedIn switch in the store the run uses
// (see the scraper's scrape.js): the one local person server.js runs as.
// `skipped` names a source the run chose not to read and says why, apart
// from `failed`, so the page can say it quietly (see the web's refreshStatus).
// `log` hears of each posting the run left out because the rules could not
// read it (see the scraper's pipeline.js): the refresh still finishes, and
// the terminal says which posting broke them, for a bug report.
export function scrapeRunner(store, { load = importScraper, userId = null, log = null } = {}) {
  return async ({ onProgress }) => {
    const { runScrape } = await load()
    const out = await runScrape({ db: store, userId, onProgress })
    for (const { error, ...posting } of out.unread ?? []) log?.warn?.({ err: error, ...posting }, UNREAD)
    return {
      fresh: out.fresh,
      total: out.total,
      tooOld: out.tooOld,
      removed: out.removed,
      closed: out.closed ?? 0,
      checked: out.checked ?? 0,
      failed: out.results.filter((r) => !r.ok).map((r) => r.name),
      skipped: out.results.filter((r) => r.skipped).map((r) => ({ name: r.name, note: r.note ?? '' })),
    }
  }
}
