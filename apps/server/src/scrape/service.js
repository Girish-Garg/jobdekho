import { createScrapeJob } from './job.js'
import { lastRunReader } from './last-run.js'
import { readRefreshPref, saveRefreshPref } from './prefs.js'
import { scrapeRunner } from './run.js'

// What the refresh routes and the hourly check share, over one store handle:
// the one job, so the two can never run a scrape each; the last completed
// run; and the auto-refresh preference. server.js builds it over the
// server's own handle, so a scrape writes the very corpus the feed already
// holds in memory (see the store's cached-file.js) rather than a second
// parsed copy of it, and the next page of the feed reads the new postings.
//
// `run` is for tests, which pass a fake so no source is ever fetched.
export function createScrapeService(store, { run = scrapeRunner(store), now = Date.now, log = null } = {}) {
  return {
    job: createScrapeJob({ run, now, log }),
    lastRun: lastRunReader(store.runs.path),
    getPref: (userId) => readRefreshPref(store, userId),
    setPref: (userId, pref) => saveRefreshPref(store, userId, pref),
  }
}
