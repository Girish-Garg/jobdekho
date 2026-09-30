// Whether there is anything to browse. `sources` is the per-source count
// the feed's own source filter reads (store/dashboard.js listSources), so the
// total is the whole stored corpus, stale rows included; `runs` is the scrape
// history, one record per run (store/runs.js), read here only for when the
// last one finished.
//
// The fix names both ways to refresh, since either is true on any install:
// Settings' own "Refresh now" and the scrape script it stands for.
const FIX = 'Press "Refresh now" in Settings, under Postings, or run "npm run scrape" in a terminal.'
const DAY_MS = 24 * 60 * 60 * 1000

// "today", "yesterday", "3 days ago": a first-run check wants to know
// whether the feed is this week's, not the minute it was written.
function ago(iso, now) {
  const at = Date.parse(iso ?? '')
  if (!Number.isFinite(at)) return null
  const days = Math.max(0, Math.floor((now - at) / DAY_MS))
  if (days === 0) return 'today'
  return days === 1 ? 'yesterday' : `${days} days ago`
}

// Runs are appended in order, but a hand-edited or merged file need not be,
// so the latest is picked by its date rather than by its line.
function lastRun(runs) {
  const dated = runs.filter((r) => Number.isFinite(Date.parse(r?.startedAt ?? '')))
  return dated.reduce((a, b) => (Date.parse(b.startedAt) > Date.parse(a.startedAt) ? b : a), dated[0] ?? null)
}

export function postingsCheck({ sources = [], runs = [], now = Date.now() } = {}) {
  const base = { id: 'postings', label: 'Postings' }
  const total = sources.reduce((sum, s) => sum + (Number(s.count) || 0), 0)
  const when = ago(lastRun(runs)?.startedAt, now)
  if (!total) {
    const detail = when ? `No postings are stored; the last refresh, ${when}, kept none.` : 'No postings are stored yet.'
    return { ...base, state: 'missing', detail, fix: FIX }
  }
  const stored = `${total.toLocaleString('en-IN')} ${total === 1 ? 'posting' : 'postings'} stored`
  return { ...base, state: 'ok', detail: when ? `${stored}, last refreshed ${when}.` : `${stored}.`, fix: null }
}
