import { toIso } from './timestamp.js'
import { entriesOf, write } from './tracker-file.js'
import { STAGES, line, contactOf, eventOf, newEntry, withEvent, lastActivity, isLater, readEntryInput } from './tracker-entry.js'

// The Tracker: every application and conversation the person keeps track
// of (each entry's shape is in tracker-entry.js). An entry need not be a
// JobDekho posting: one applied for elsewhere is added by hand, and a mail
// sent from the chat to a founder makes one of its own (tracker-mail.js).
//
// Refusals are words, not sentences ('missing', 'company', 'stage'), which
// the route says in its own words (see the server's api/tracker.js).

// Newest activity first, the order the page lists them in.
export function listTracker(store, userId) {
  return [...entriesOf(store, userId)].sort((a, b) => (lastActivity(a) < lastActivity(b) ? 1 : -1))
}

export function addTrackerEntry(store, userId, input, now = new Date()) {
  const fields = readEntryInput(input, now)
  if (fields.error) return fields
  const entry = newEntry(fields, now)
  write(store, userId, [...entriesOf(store, userId), entry])
  return { entry }
}

function changed(entry, patch, now) {
  const next = { ...entry }
  if ('company' in patch) next.company = line(patch.company) || entry.company
  if ('role' in patch) next.role = line(patch.role)
  if ('contact' in patch) next.contact = contactOf(patch.contact)
  const moved = patch.stage && patch.stage !== entry.stage
  if (moved) Object.assign(next, { stage: patch.stage, stageAt: toIso(now) })
  const note = line(patch.note, 300)
  return moved || note ? withEvent(next, eventOf({ at: now, stage: moved ? patch.stage : null, text: note })) : next
}

// A stage, a note, or the names: a stage moved or a note added is a line
// in the history, dated now.
export function updateTrackerEntry(store, userId, id, patch = {}, now = new Date()) {
  if (patch.stage != null && !STAGES.includes(patch.stage)) return { error: 'stage' }
  const entries = entriesOf(store, userId)
  const at = entries.findIndex((entry) => entry.id === id)
  if (at < 0) return { error: 'missing' }
  const entry = changed(entries[at], patch, now)
  write(store, userId, entries.with(at, entry))
  return { entry }
}

export function removeTrackerEntry(store, userId, id) {
  const entries = entriesOf(store, userId)
  if (!entries.some((entry) => entry.id === id)) return false
  write(store, userId, entries.filter((entry) => entry.id !== id))
  return true
}

// A posting marked Applied in the feed: tracked once, from then on.
export function trackApplied(store, userId, posting, now = new Date()) {
  const entries = entriesOf(store, userId)
  const known = entries.find((entry) => entry.postingId === posting.id)
  if (known) return known
  const entry = newEntry({
    company: line(posting.company), role: line(posting.title), postingId: posting.id, stageAt: toIso(now),
    events: [eventOf({ at: now, stage: 'applied', text: 'Marked Applied in JobDekho' })],
  }, now)
  write(store, userId, [...entries, entry])
  return entry
}

export { trackMail } from './tracker-mail.js'
export { STAGES, isLater }
