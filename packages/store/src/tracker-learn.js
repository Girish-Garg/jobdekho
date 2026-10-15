import { compactKey } from '@jobdekho/core/company-key.js'
import { entriesOf, write } from './tracker-file.js'
import { learn } from './mail-labels.js'

// The person's corrections to what the mail scan filed, which it learns from
// (see mail-labels.js).
//
// "Not a job" on an entry the scan made: what sent it is never filed again,
// and every entry that came only from that sender goes with it, so a course
// site that filled a lane leaves in one press. A company's own domain, or a
// sender with no hiring system behind it, is skipped by its domain; mail that
// came through a hiring system or a board, which many companies share, is
// skipped by the company instead.
const OWN = new Set(['company', 'marketing'])

const mailLines = (entry) => entry.events.filter((event) => event.mailId)

export function notAJob(store, userId, id, now = new Date()) {
  const entries = entriesOf(store, userId)
  const entry = entries.find((one) => one.id === id)
  if (!entry) return { error: 'missing' }
  const lines = mailLines(entry)
  const domains = new Set(lines.filter((event) => OWN.has(event.via) && event.sender).map((event) => event.sender))
  const companies = new Set(lines.some((event) => !OWN.has(event.via)) ? [compactKey(entry.company)] : [])
  const skipped = (event, company) => domains.has(event.sender) || companies.has(company)
  const goes = (one) => one.id === id || (one.source === 'mail' && mailLines(one).length === one.events.length && one.events.every((event) => skipped(event, compactKey(one.company))))
  const gone = entries.filter(goes)
  write(store, userId, entries.filter((one) => !goes(one)))
  learn(store, userId, {
    domains: [...domains],
    companies: [...companies],
    labels: gone.flatMap(mailLines).map((event) => ({ mailId: event.mailId, label: 'not-job', text: event.text, sender: event.sender })),
  }, now)
  return { removed: gone.length, domains: [...domains], companies: [...companies] }
}

// A mail-found entry moved to another stage by hand: its newest mail was
// read wrong, and that is an example to learn from.
export function noteStageCorrection(store, userId, before, stage, now = new Date()) {
  const newest = mailLines(before).at(-1)
  if (!newest || stage === before.stage) return
  learn(store, userId, { labels: [{ mailId: newest.mailId, label: stage, text: newest.text, sender: newest.sender }] }, now)
}
