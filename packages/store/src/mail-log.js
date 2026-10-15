import { toIso } from './timestamp.js'
import { cleanEmail, line } from './tracker-entry.js'

// The Gmail address the person connected and the mails JobDekho sent for
// them. The app password itself is never in either file: the server keeps
// it in the computer's protected storage (see its mail/secret.js), and this
// record only says where (`keptIn`).
//
//   mail-account.json  { address, keptIn, savedAt }
//   mail-sent.json     { sent: [{ at, to, subject, proposalId }] }
//
// The sent list is what the daily cap counts and what says "you mailed them
// on 13 Oct" on a second mail to the same address. The mails themselves are
// in the person's own Gmail Sent folder.
const MAX_SENT = 500
export const DAY_MS = 24 * 60 * 60 * 1000

export function getMailAccount(store, userId) {
  const record = store.mailAccount.get(userId)
  const address = cleanEmail(record?.address)
  return address ? { address, keptIn: line(record.keptIn, 40) || null, savedAt: toIso(record.savedAt) } : null
}

export function saveMailAccount(store, userId, { address, keptIn }, now = new Date()) {
  store.mailAccount.set(userId, { address: cleanEmail(address), keptIn, savedAt: toIso(now) })
}

export const clearMailAccount = (store, userId) => store.mailAccount.remove(userId)

const sentList = (store, userId) => store.mailSent.get(userId)?.sent ?? []

export function logSentMail(store, userId, { to, subject, proposalId = null }, now = new Date()) {
  const entry = { at: toIso(now), to: cleanEmail(to), subject: line(subject, 200), proposalId }
  store.mailSent.set(userId, { sent: [...sentList(store, userId), entry].slice(-MAX_SENT) })
  return entry
}

// How many went out in the last 24 hours: a rolling day, so the cap means
// the same thing whatever the time zone and whenever the day turns.
export function sentInLastDay(store, userId, now = new Date()) {
  const since = toIso(now.getTime() - DAY_MS)
  return sentList(store, userId).filter((mail) => mail.at > since).length
}

// The subjects of the mails sent lately, for the scan to find the replies
// to them (see the server's mail-scan/query.js).
export function recentSubjects(store, userId, now = new Date(), days = 120) {
  const since = toIso(now.getTime() - days * DAY_MS)
  return sentList(store, userId).filter((mail) => mail.at > since).map((mail) => mail.subject).filter(Boolean)
}

// When each address was last mailed, newest wins.
export function lastMailed(store, userId) {
  const out = new Map()
  for (const mail of sentList(store, userId)) if (!out.has(mail.to) || out.get(mail.to) < mail.at) out.set(mail.to, mail.at)
  return out
}
