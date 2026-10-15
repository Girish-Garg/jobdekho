import { compactKey, words } from '@jobdekho/core/company-key.js'
import { toIso } from './timestamp.js'
import { entriesOf, write, lastScanOf } from './tracker-file.js'
import { line, contactOf, eventOf, newEntry, isLater, shortId } from './tracker-entry.js'

// A mail scan into the Tracker, all at once, with one Undo (see the
// server's mail-scan/run.js). Each application the scan found (company,
// role, its mails oldest first) lands on the entry for the same company and
// role, else on a new one. Each mail is a line in that entry's history, once:
// a mail already there, by its id, is skipped, so scanning the same days
// twice changes nothing. The stage follows the newest mail, forward only,
// except a rejection, which closes it from any stage.
//
//   group: { company, role, contact, mails: [{ id, date, kind, text, from, sender, via }] }
const STAGE = { applied: 'applied', replied: 'replied', assessment: 'assessment', interview: 'interview', offer: 'offer', rejected: 'closed' }

const roleKey = (role) => words(role).join(' ')

function matchFor(entries, group) {
  const company = compactKey(group.company)
  const role = roleKey(group.role)
  const same = entries.filter((entry) => compactKey(entry.company) === company)
  return same.find((entry) => roleKey(entry.role) === role)
    ?? (role ? same.find((entry) => !roleKey(entry.role)) : same.at(-1))
    ?? null
}

function merged(entry, group) {
  const known = new Set(entry.events.map((event) => event.mailId).filter(Boolean))
  const fresh = group.mails.filter((mail) => !known.has(mail.id))
  if (!fresh.length) return null
  const events = fresh.map((mail) => eventOf({ at: mail.date, stage: STAGE[mail.kind], text: mail.text, from: mail.from, mailId: mail.id, sender: mail.sender, via: mail.via }))
  const newest = fresh.at(-1)
  const stage = STAGE[newest.kind]
  const isNew = !entry.events.length
  const moves = isNew || (stage === 'closed' ? !entry.stageAt || toIso(newest.date) >= entry.stageAt : isLater(stage, entry.stage))
  return {
    ...entry,
    role: entry.role || line(group.role),
    contact: entry.contact ?? contactOf(group.contact),
    events: [...entry.events, ...events].sort((a, b) => ((a.at ?? '') < (b.at ?? '') ? -1 : 1)),
    ...(moves ? { stage, stageAt: toIso(newest.date) } : {}),
  }
}

// Resolves { added, updated }. The entries as they were before, and the ids
// of the new ones, are kept as the scan's undo.
export function applyMailScan(store, userId, groups, now = new Date()) {
  let entries = entriesOf(store, userId)
  const created = []
  const before = {}
  for (const group of groups) {
    const found = matchFor(entries, group)
    const base = found ?? newEntry({ company: line(group.company), role: line(group.role), source: 'mail', stage: STAGE[group.mails[0].kind] }, now)
    const next = merged(base, group)
    if (!next) continue
    if (found) {
      before[found.id] ??= found
      entries = entries.map((entry) => (entry.id === found.id ? next : entry))
    } else {
      created.push(next.id)
      entries = [...entries, next]
    }
  }
  // A scan that changed nothing leaves the last one's Undo as it was.
  if (!created.length && !Object.keys(before).length) return { added: 0, updated: 0 }
  const lastScan = { id: shortId(), at: toIso(now), created, before }
  write(store, userId, entries, { lastScan })
  return { added: created.length, updated: Object.keys(before).length }
}

// Puts the Tracker back as it was before the last scan: its new entries
// gone, the ones it changed as they were. The mails stay known to the scan,
// so the next one does not bring them back.
export function undoMailScan(store, userId) {
  const scan = lastScanOf(store, userId)
  if (!scan) return { undone: false }
  const created = new Set(scan.created)
  const entries = entriesOf(store, userId).filter((entry) => !created.has(entry.id)).map((entry) => scan.before[entry.id] ?? entry)
  write(store, userId, entries, { lastScan: null })
  return { undone: true, removed: created.size, restored: Object.keys(scan.before).length }
}
