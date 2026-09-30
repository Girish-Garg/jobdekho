// Refreshing without being asked, so the postings are never more than a day
// old while JobDekho is running. The first check waits a minute, so the
// server is serving pages before a scrape starts competing with it; after
// that it checks hourly, so a laptop that slept through the night catches up
// within the hour it wakes rather than a day later.
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
export const FIRST_CHECK_MS = 60 * 1000
export const CHECK_EVERY_MS = HOUR_MS

// Due when nothing has run yet, when the last run is a day old, or when every
// source in it failed: that was a computer offline, not a refresh, and waiting
// a day to try again would leave the feed a day staler for nothing.
export function isDue(lastRun, now) {
  if (!lastRun) return true
  if (lastRun.sources > 0 && lastRun.failed.length === lastRun.sources) return true
  const at = Date.parse(lastRun.at ?? '')
  return Number.isNaN(at) || now - at >= DAY_MS
}

// Unref'd, so these timers never keep a process alive that is otherwise done.
const REAL_TIMERS = {
  after: (ms, fn) => setTimeout(fn, ms).unref(),
  every: (ms, fn) => setInterval(fn, ms).unref(),
}

// `scrape` is the service from service.js. Tests pass their own `timers` and
// `now`, so no real timer ever starts; the check is returned for them to call.
// It resolves true when it started a run.
export function startAutoRefresh({ scrape, userId, now = Date.now, timers = REAL_TIMERS, log = null }) {
  async function check() {
    try {
      if (scrape.job.isRunning()) return false
      if (!scrape.getPref(userId).autoRefresh) return false
      if (!isDue(scrape.lastRun(), now())) return false
      return scrape.job.start() !== null
    } catch (err) {
      log?.error?.(err)
      return false
    }
  }
  timers.after(FIRST_CHECK_MS, check)
  timers.every(CHECK_EVERY_MS, check)
  return check
}
