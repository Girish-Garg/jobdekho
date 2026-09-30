// How a posting seen again updates the stored one, and how one a source
// listed without sending in full still counts as seen.

// Everything a re-scrape may legitimately correct. firstSeenAt and id are
// absent on purpose: the first is what "new today" is measured from, and the
// second is the key. Without this refresh an adapter fix could never reach
// rows already stored, so a parser bug was permanent.
const REFRESHABLE = [
  'title', 'company', 'location', 'url', 'descriptionSnippet', 'descriptionText', 'tags',
  'stipend', 'duration', 'experience', 'postedAt',
  'level', 'degreeMin', 'degreeRequired', 'workMode', 'type',
  'stipendMin', 'currency', 'durationMonths', 'experienceYears', 'groupKey', 'logoUrl', 'features',
  // Bumping this on every conflict is what makes staleness detectable: a row
  // whose lastSeenAt stops advancing is no longer being listed anywhere.
  'lastSeenAt',
]

// A posting seen again as a bare search card (LinkedIn lists cards, and its
// description is fetched once, see boards/linkedin.js) carries no text, and
// copying that over would wipe the description fetched on an earlier run,
// with what was read from it. Those stay until a sighting brings text again.
const READ_FROM_TEXT = ['descriptionSnippet', 'descriptionText', 'level', 'degreeMin', 'degreeRequired', 'type', 'features']

// A sighting without a logo (a card whose image had not loaded, a board that
// shows none today) says nothing about the company's logo, so the one already
// stored stays.
const KEEP_WHEN_MISSING = ['logoUrl']

export function refreshed(existing, row) {
  const out = { ...existing }
  const bare = !row.descriptionText && Boolean(existing.descriptionText)
  for (const column of REFRESHABLE) {
    if (bare && READ_FROM_TEXT.includes(column)) continue
    if (KEEP_WHEN_MISSING.includes(column) && row[column] == null) continue
    out[column] = row[column]
  }
  return out
}

// Postings a source listed but did not send, because the store already held
// their text: Workday and the other list-then-describe adapters skip those
// (see the scraper's scrape.js, which collects them). Being listed is being
// seen. Without this their lastSeenAt froze at the first read, so the feed
// hid them as stale after 21 days and the cleanup deleted them after 60,
// while they were still open.
export function markSeen(rows, ids, now) {
  for (const id of ids) {
    const row = rows.get(id)
    if (row) rows.set(id, { ...row, lastSeenAt: now })
  }
}
