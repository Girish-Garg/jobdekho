// How each source has been faring across runs, and when to leave one alone.
// Pure rules over one record per source (the store's source-health.json)
// with the clock passed in; health-turn.js reads and writes it around a
// scrape. LinkedIn keeps its own guard (linkedin-guard.js) and is not here.
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

// Three failed runs in a row pause a source for three days, doubling with each
// pause after that, to two weeks at most. A board that is down for a while
// stops costing a request (and a retry) on every run, and comes back on its own.
export const FAILS_TO_PAUSE = 3
export const FIRST_PAUSE_MS = 3 * DAY_MS
export const LONGEST_PAUSE_MS = 14 * DAY_MS
// A 404, 410 or 422 twice in a row is a board that is gone or was named
// wrongly: waiting will not mend it, so it rests the longest and says why.
const GONE = /\bHTTP (404|410|422)\b/
// A host that answered 429 asked for less: a week off after a failed run, two
// days after one it cut short.
const REFUSED = /\b429\b|\brefused\b/i
const REFUSED_PAUSE_MS = 7 * DAY_MS
const SHORT_PAUSE_MS = 2 * DAY_MS

const iso = (ms) => new Date(ms).toISOString()
const pauseAfter = (pauses) => Math.min(FIRST_PAUSE_MS * 2 ** Math.max(0, pauses - 1), LONGEST_PAUSE_MS)

export function isPaused(record, nowMs) {
  const until = Date.parse(record?.pausedUntil ?? '')
  return Number.isFinite(until) && nowMs < until
}

// The record after one run's result. `result` is the runner's { ok, error,
// note, count }; `listed` counts every posting the source listed, sent or
// skipped as already stored; `body` is the share of its new postings with a
// real description, or null when it sent too few to judge.
export function nextRecord(before = {}, { result, listed = 0, body = null }, nowMs) {
  const at = iso(nowMs)
  const base = { ...before, lastRunAt: at, pausedUntil: null, reason: null }
  if (!result.ok) {
    const failures = (before.failures ?? 0) + 1
    const error = String(result.error ?? '')
    const gone = GONE.test(error) && GONE.test(String(before.lastError ?? ''))
    const refused = REFUSED.test(error)
    const pauses = (before.pauses ?? 0) + 1
    const pause = gone ? LONGEST_PAUSE_MS : refused ? REFUSED_PAUSE_MS : failures >= FAILS_TO_PAUSE ? pauseAfter(pauses) : 0
    if (!pause) return { ...base, failures, lastError: error }
    const reason = gone ? 'gone' : refused ? 'refused' : 'failing'
    return { ...base, failures, lastError: error, pausedUntil: iso(nowMs + pause), pauses, reason }
  }
  const cut = REFUSED.test(String(result.note ?? ''))
  const zeroRuns = listed === 0 && (before.everListed ?? false) ? (before.zeroRuns ?? 0) + 1 : 0
  const thin = body !== null && (before.body ?? 0) >= 0.5 && body < 0.2
  return {
    ...base, failures: 0, pauses: 0, lastError: null, lastOkAt: at, listed, zeroRuns,
    everListed: Boolean(before.everListed || listed > 0),
    body: body ?? before.body ?? null, thin,
    ...(cut ? { pausedUntil: iso(nowMs + SHORT_PAUSE_MS), reason: 'refused' } : {}),
  }
}

// What Settings shows: sources resting and why, and sources that answer but
// look wrong (nothing listed for three runs, or descriptions gone missing).
export function healthView(state, nowMs) {
  const paused = []
  const alerts = []
  for (const [name, record] of Object.entries(state ?? {})) {
    if (isPaused(record, nowMs)) paused.push({ name, until: record.pausedUntil, reason: record.reason ?? 'failing', error: record.lastError ?? '' })
    else if ((record.zeroRuns ?? 0) >= 3) alerts.push({ name, kind: 'empty' })
    else if (record.thin) alerts.push({ name, kind: 'thin' })
  }
  paused.sort((a, b) => a.name.localeCompare(b.name))
  alerts.sort((a, b) => a.name.localeCompare(b.name))
  return { paused, alerts }
}
