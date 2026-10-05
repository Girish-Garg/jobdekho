import { normalizeGuard, guardView } from '@jobdekho/scraper/linkedin-guard.js'
import { healthView } from '@jobdekho/scraper/source-guard.js'
import { createScrapeJob } from './job.js'
import { lastRunReader } from './last-run.js'
import { readRefreshPref, saveRefreshPref } from './prefs.js'
import { scrapeRunner } from './run.js'

// What the refresh routes and the hourly check share, over one store handle:
// the one job, so the two can never run a scrape each; the last completed
// run; the refresh switches; and where LinkedIn's guard stands (see the
// scraper's linkedin-guard.js), which the guard's own file says whichever
// process last swept. server.js builds it over the server's own handle, so
// a scrape writes the very corpus the feed already holds in memory (see the
// store's cached-file.js) rather than a second parsed copy of it, and the
// next page of the feed reads the new postings.
//
// `userId` is whose Adzuna key and LinkedIn switch a run obeys (see run.js).
// `run` is for tests, which pass a fake so no source is ever fetched.
export function createScrapeService(store, {
  userId = null, log = null, run = scrapeRunner(store, { userId, log }), now = Date.now,
} = {}) {
  return {
    job: createScrapeJob({ run, now, log }),
    lastRun: lastRunReader(store.runs.path),
    getPref: (userId) => readRefreshPref(store, userId),
    setPref: (userId, change) => saveRefreshPref(store, userId, change),
    linkedinStatus: () => guardView(normalizeGuard(store.linkedinGuard.get()), now()),
    // Sources resting after repeated failures, and ones that answer but look
    // wrong (see the scraper's source-guard.js).
    sourceHealth: () => healthView(store.sourceHealth.get(), now()),
  }
}
