import { randomBytes } from 'node:crypto'
import { toIso } from './timestamp.js'

// One application or conversation the person keeps track of, whether it
// began in JobDekho or not (see tracker.js):
//
//   { id, company, role, postingId, contact: { name, email } | null,
//     stage, stageAt, events: [{ id, at, stage, text }], createdAt }
//
// The stages run in this order, and only a person moves one back: a mail
// sent to someone at an interview stage adds to the history, it does not
// put the entry back to "emailed". `stageAt` is null when nobody knows
// when it got there, as for the postings marked Applied before the Tracker
// kept dates.
export const STAGES = ['applied', 'emailed', 'replied', 'assessment', 'interview', 'offer', 'closed']
export const MAX_EVENTS = 60
const MAX_NAME = 120
const MAX_TEXT = 300

export const line = (value, max = MAX_NAME) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '')

// One address, as a person types it: no spaces, no brackets or quotes that
// could carry a second address or a display name into a mail header.
const EMAIL = /^[^\s@<>"',;:()[\]\\]+@[^\s@<>"',;:()[\]\\]+\.[A-Za-z]{2,}$/
export function cleanEmail(value) {
  const text = line(value, 254).toLowerCase()
  return EMAIL.test(text) ? text : ''
}

export const shortId = () => randomBytes(5).toString('hex')

export const isLater = (stage, than) => STAGES.indexOf(stage) > STAGES.indexOf(than)

export function contactOf(raw) {
  const name = line(raw?.name)
  const email = cleanEmail(raw?.email)
  return name || email ? { name, email } : null
}

export function eventOf({ at, stage = null, text = '' }) {
  return { id: shortId(), at: toIso(at), stage: STAGES.includes(stage) ? stage : null, text: line(text, MAX_TEXT) }
}

// What a person typed into "Add one", or a refusal as a word the route says
// in its own sentence: 'company' when there is no company, 'stage' for a
// stage that is not one of STAGES.
export function readEntryInput(raw, now = new Date()) {
  const company = line(raw?.company)
  if (!company) return { error: 'company' }
  const stage = raw?.stage ?? 'applied'
  if (!STAGES.includes(stage)) return { error: 'stage' }
  const at = toIso(raw?.date) ?? toIso(now)
  return {
    company,
    role: line(raw?.role),
    postingId: line(raw?.postingId, 64) || null,
    contact: contactOf(raw?.contact),
    stage,
    stageAt: at,
    events: [eventOf({ at, stage, text: line(raw?.note, MAX_TEXT) })],
  }
}

export function newEntry(fields, now = new Date()) {
  return { id: shortId(), company: '', role: '', postingId: null, contact: null, stage: 'applied', stageAt: null, events: [], createdAt: toIso(now), ...fields }
}

// The entry with one more line of history, the oldest let go past the cap.
export function withEvent(entry, event) {
  return { ...entry, events: [...entry.events, event].slice(-MAX_EVENTS) }
}

// When the entry last moved: its newest dated event. One with no date at
// all (a posting marked Applied before the Tracker kept dates) reads as
// the oldest, so it never sits above what happened this week.
export function lastActivity(entry) {
  const dated = entry.events.map((event) => event.at).filter(Boolean).sort()
  return dated.at(-1) ?? entry.stageAt ?? ''
}
