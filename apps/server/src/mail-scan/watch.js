import { getMailAccount } from '@jobdekho/store/mail-log.js'
import { getScanState, resetScan } from '@jobdekho/store/mail-scan-state.js'
import { scanMail } from './run.js'

// The mail scan as a job: one at a time, its progress for the Tracker and
// Settings to show, and the checks it makes on its own. The person starts
// the first scan (it reads the whole mailbox); from then on, a catch-up
// shortly after JobDekho starts, so a day it was closed is filed when it
// opens, and a check every 15 minutes while it runs.
//
// `deps()` gives { store, secrets, open } (see mail/deps.js); `timers` and
// `now` are seams, so no test starts a real timer.
export const FIRST_CHECK_MS = 20 * 1000
export const CHECK_EVERY_MS = 15 * 60 * 1000

const REAL_TIMERS = {
  after: (ms, fn) => setTimeout(fn, ms).unref(),
  every: (ms, fn) => setInterval(fn, ms).unref(),
}

export function createMailWatch({ deps, dashboard, userId, log = null, now = () => new Date() }) {
  let running = null
  let progress = null
  let last = null

  async function run({ full = false } = {}) {
    if (running) return running
    const { store, secrets, open } = deps()
    if (full) resetScan(store, userId)
    progress = { step: 'starting' }
    running = scanMail({ store, secrets, open: open ?? undefined, dashboard, userId, now, progress: (step) => { progress = step } })
      .then((outcome) => { last = { ok: true, at: now().toISOString(), ...outcome } })
      .catch((err) => {
        if (err.name !== 'MailError') log?.error?.(err)
        last = { ok: false, at: now().toISOString(), error: err.name === 'MailError' ? err.message : 'The mail scan stopped on an error. Try again.' }
      })
      .finally(() => { running = null; progress = null })
    return running
  }

  // Only once the person has scanned at least once, and only with Gmail
  // still connected.
  async function check() {
    const { store } = deps()
    if (running || !getMailAccount(store, userId) || !getScanState(store, userId).firstAt) return false
    await run()
    return true
  }

  function status() {
    const { store } = deps()
    const state = getScanState(store, userId)
    return {
      connected: Boolean(getMailAccount(store, userId)),
      firstAt: state.firstAt,
      lastAt: state.lastAt,
      running: Boolean(running),
      progress,
      last,
      unsure: state.unsure,
      canUndo: Boolean(dashboard.lastMailScan(userId)),
    }
  }

  function start(timers = REAL_TIMERS) {
    timers.after(FIRST_CHECK_MS, check)
    timers.every(CHECK_EVERY_MS, check)
  }

  return { run, check, status, start }
}

// One watch per data folder and person, whoever asks for it: the routes and
// the checks start.js begins share it, so a scan the person starts and one
// the clock starts can never run side by side.
const watches = new Map()

export function mailWatchFor(options) {
  const key = `${options.deps().store.dir}|${options.userId}`
  if (!watches.has(key)) watches.set(key, createMailWatch(options))
  return watches.get(key)
}
