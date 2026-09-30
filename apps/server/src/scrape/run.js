// The scrape the server runs: the scraper's own runScrape (apps/scraper/src/
// scrape.js), reading the same config files the CLI reads, writing into the
// store this server holds, reduced to what the browser is shown of it.
//
// Imported on the first refresh rather than at startup: the source adapters
// bring an HTML parser nothing else in the server uses, and every test that
// builds the app would load it for nothing.
const importScraper = () => import('@jobdekho/scraper/scrape.js')

// `userId` is whose Adzuna key in the store the run uses (see the scraper's
// scrape.js): the one local person server.js runs as.
export function scrapeRunner(store, { load = importScraper, userId = null } = {}) {
  return async ({ onProgress }) => {
    const { runScrape } = await load()
    const out = await runScrape({ db: store, userId, onProgress })
    return {
      fresh: out.fresh,
      total: out.total,
      tooOld: out.tooOld,
      removed: out.removed,
      failed: out.results.filter((r) => !r.ok).map((r) => r.name),
    }
  }
}
