import { postingNames } from './posting-lookup.js'
import { eventOf, newEntry } from './tracker-entry.js'

// tracker.json, one record per user: { seeded, entries }. Read and written
// only through these two, by tracker.js and tracker-mail.js.
const MAX_ENTRIES = 1000

export const write = (store, userId, entries) => store.tracker.set(userId, { seeded: true, entries: entries.slice(-MAX_ENTRIES) })

// The first read makes an entry for each posting already marked Applied,
// which the Tracker replaces as the place applications are kept. When each
// was applied for was never recorded, so they carry no date rather than a
// made-up one. A posting the corpus no longer holds has no name to show.
function seeded(store, userId) {
  const marked = Object.entries(store.statuses.get(userId) ?? {}).filter(([, status]) => status === 'applied').map(([id]) => id)
  const names = postingNames(store, marked)
  return marked.filter((id) => names.has(id)).map((id) => newEntry({
    company: names.get(id).company, role: names.get(id).title, postingId: id,
    events: [eventOf({ at: null, stage: 'applied', text: 'Marked Applied in JobDekho' })],
  }))
}

export function entriesOf(store, userId) {
  const record = store.tracker.get(userId)
  if (record?.seeded) return record.entries ?? []
  const entries = seeded(store, userId)
  write(store, userId, entries)
  return entries
}
