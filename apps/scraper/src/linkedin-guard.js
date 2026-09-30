import { FIRST_SWEEP, DAILY_SWEEP, PAST_MONTH } from '@jobdekho/sources/boards/linkedin-plan.js'

// LinkedIn does not allow automated access, so nothing can promise it will
// never block this computer's address. What this can do is keep JobDekho
// looking like one person browsing: read LinkedIn at most once a day however
// many refreshes run, and stay away for days, longer each time, when it
// objects. Pure rules over { lastSweepAt, pausedUntil, refusals } (the store's
// linkedin-guard.json) with the clock passed in; linkedin-turn.js does the
// reading and writing around a scrape.
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

// 20 hours rather than 24, so a daily refresh that comes round a little
// early (the server checks hourly) still reads it.
export const SWEEP_EVERY_MS = 20 * HOUR_MS
// A refusal pauses LinkedIn for two days, doubling with each refusal in a
// row, to two weeks at most. A clean sweep starts the count again.
export const FIRST_PAUSE_MS = 48 * HOUR_MS
export const LONGEST_PAUSE_MS = 14 * DAY_MS
// A daily sweep looks back a week. After a longer gap than that, less a day
// to spare, it looks back a month so the days between are not lost.
const WEEK_GAP_MS = 6 * DAY_MS

const timeOf = (value) => {
  const t = typeof value === 'string' ? Date.parse(value) : NaN
  return Number.isNaN(t) ? null : t
}
const iso = (ms) => new Date(ms).toISOString()

// Whatever the file holds, a guard: a time that does not read is no time,
// and a refusal count that is not a whole number is none.
export function normalizeGuard(raw) {
  const at = (key) => (timeOf(raw?.[key]) === null ? null : iso(timeOf(raw[key])))
  const refusals = Number.isInteger(raw?.refusals) && raw.refusals > 0 ? raw.refusals : 0
  return { lastSweepAt: at('lastSweepAt'), pausedUntil: at('pausedUntil'), refusals }
}

export const pauseAfter = (refusals) => Math.min(FIRST_PAUSE_MS * 2 ** Math.max(0, refusals - 1), LONGEST_PAUSE_MS)

// Whether this scrape reads LinkedIn, and at what size. Skipping says why
// ('paused' or 'recent') and `until` when; running carries the sweep's size
// for the adapter ({ lookback, searches, views }). A last read dated in the
// future is a clock that was wrong, and must not hold LinkedIn off for good.
export function planSweep(guard, now) {
  const paused = timeOf(guard.pausedUntil)
  if (paused !== null && now < paused) return { run: false, why: 'paused', until: guard.pausedUntil, lastSweepAt: guard.lastSweepAt }
  const last = timeOf(guard.lastSweepAt)
  if (last === null) return { run: true, sweep: FIRST_SWEEP }
  const gap = now - last
  if (gap >= 0 && gap < SWEEP_EVERY_MS) return { run: false, why: 'recent', until: iso(last + SWEEP_EVERY_MS), lastSweepAt: guard.lastSweepAt }
  const lookback = gap >= 0 && gap <= WEEK_GAP_MS ? DAILY_SWEEP.lookback : PAST_MONTH
  return { run: true, sweep: { ...DAILY_SWEEP, lookback } }
}

// The guard after a sweep, from the adapter's outcome: { answered, refusal }
// (see packages/sources/src/boards/linkedin.js). `before` is the guard as it
// was before the sweep began. A sweep no request of which reached LinkedIn
// (the computer was offline) read nothing and leaves the guard as it was; an
// adapter that did not say counts as having reached it.
export function recordSweep(before, { answered = 1, refusal = null } = {}, now) {
  if (!refusal && answered === 0) return before
  if (!refusal) return { lastSweepAt: iso(now), pausedUntil: null, refusals: 0 }
  const refusals = before.refusals + 1
  const pause = Math.max(pauseAfter(refusals), refusal.retryAfterMs ?? 0)
  return { lastSweepAt: iso(now), pausedUntil: iso(now + pause), refusals }
}

// What Settings shows: when LinkedIn was last read, the end of a pause still
// running, and the earliest the next read can be (null: the next refresh).
export function guardView(guard, now) {
  const plan = planSweep(guard, now)
  return {
    lastSweepAt: guard.lastSweepAt,
    pausedUntil: plan.why === 'paused' ? plan.until : null,
    nextAfter: plan.run ? null : plan.until,
  }
}
