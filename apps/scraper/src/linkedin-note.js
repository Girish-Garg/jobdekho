// The sentence a run records for a LinkedIn it skipped, shown beside the
// sources it read ("LinkedIn read 5 h ago; next after 15 h") rather than
// among the ones that failed: skipping is the guard working, not a fault.
const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS

const span = (ms) => (ms < HOUR_MS ? `${Math.max(1, Math.round(ms / MINUTE_MS))} min` : `${Math.round(ms / HOUR_MS)} h`)

// "Fri 3 Oct" in this computer's time zone. Written out by hand rather than
// through Intl, whose names differ from one ICU build to the next (the web's
// lib/time.js does the same).
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function shortDay(value) {
  const d = new Date(value)
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

// `skip` is what the guard's planSweep said when it did not run.
export function skipNote(skip, now) {
  if (skip.why === 'paused') return `LinkedIn paused until ${shortDay(skip.until)}: it refused the last read`
  const read = Math.max(0, now - Date.parse(skip.lastSweepAt))
  const next = Math.max(0, Date.parse(skip.until) - now)
  return `LinkedIn read ${span(read)} ago; next after ${span(next)}`
}
