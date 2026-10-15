import { toIso } from './timestamp.js'
import { entriesOf, write } from './tracker-file.js'
import { line, cleanEmail, eventOf, newEntry, withEvent, isLater } from './tracker-entry.js'

// A mail sent from the chat, in the Tracker: the entry it belongs to moves
// to "emailed" (never back from a later stage, see tracker-entry.js) and
// gets a line saying who was mailed and about what; with no entry it
// belongs to, it makes one.
//
// Which entry it belongs to, most certain first: the posting its chat was
// about, then an entry with the same contact address, then one with the
// same company and role. A mail to a second person at a company the person
// applied to through a posting still lands on that application when the
// role matches, which is the one they would look for.
const same = (a, b) => line(a).toLowerCase() === line(b).toLowerCase()

function belongsTo(entries, mail) {
  return (mail.postingId && entries.find((entry) => entry.postingId === mail.postingId))
    || entries.find((entry) => entry.contact?.email && entry.contact.email === mail.to)
    || entries.find((entry) => same(entry.company, mail.company) && same(entry.role, mail.role))
    || null
}

//   mail: { to, name, company, role, postingId, subject }
export function trackMail(store, userId, mail, now = new Date()) {
  const to = cleanEmail(mail.to)
  const entries = entriesOf(store, userId)
  const found = belongsTo(entries, { ...mail, to })
  const base = found ?? newEntry({ company: line(mail.company) || to.split('@')[1], role: line(mail.role), postingId: mail.postingId ?? null }, now)
  const moves = !found || isLater('emailed', base.stage)
  const who = line(mail.name) ? `${line(mail.name)} (${to})` : to
  const event = eventOf({ at: now, stage: moves ? 'emailed' : null, text: `Mailed ${who}: ${line(mail.subject, 200)}` })
  const entry = withEvent({
    ...base,
    contact: base.contact ?? { name: line(mail.name), email: to },
    ...(moves ? { stage: 'emailed', stageAt: toIso(now) } : {}),
  }, event)
  write(store, userId, found ? entries.map((one) => (one.id === found.id ? entry : one)) : [...entries, entry])
  return entry
}
