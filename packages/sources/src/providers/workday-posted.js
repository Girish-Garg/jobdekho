// The list gives a posting's age as prose, not a date: "Posted Today",
// "Posted Yesterday", "Posted 3 Days Ago", "Posted 30+ Days Ago". The detail
// call's startDate is exact and replaces this whenever it arrives, so this is
// only what a posting carries when its detail call did not.
//
// Workday stops counting at 30, and "30+" is read as 30 rather than unknown.
// It is a true lower bound: it keeps a month-old role sorted behind this
// week's, where null would lose that it is old at all, and it can never push
// a posting past the 60-day cut in core's freshness.js, which only a real
// date should do.
const DAY_MS = 24 * 60 * 60 * 1000

export function postedDaysAgo(text) {
  const s = String(text || '').toLowerCase()
  if (/\btoday\b/.test(s)) return 0
  if (/\byesterday\b/.test(s)) return 1
  const n = s.match(/(\d+)\+?\s*days?\s+ago/)
  return n ? Number(n[1]) : null
}

// Counted back from midnight UTC, the same instant a startDate such as
// "2026-09-30" parses to, so the two sources of a date agree on a day.
export function postedAtFrom(text, now = Date.now()) {
  const days = postedDaysAgo(text)
  if (days == null) return null
  const today = new Date(now)
  const midnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return new Date(midnight - days * DAY_MS).toISOString()
}
