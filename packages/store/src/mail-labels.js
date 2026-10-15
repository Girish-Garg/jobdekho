import { toIso } from './timestamp.js'
import { line } from './tracker-entry.js'

// What the person taught the mail scan, in mail-labels.json: the senders and
// companies whose mail is never an application ("Not a job" on a card), and
// every correction as an example for the local model to learn from (a mail
// marked not a job, or moved to another stage). Kept on this computer only.
//
//   { domains: [domain], companies: [key], labels: [{ mailId, label, text, sender, at }] }
//
// `label` is 'not-job' or the stage the person moved it to.
const MAX_LABELS = 5000

function read(store, userId) {
  const record = store.mailLabels.get(userId) ?? {}
  return {
    domains: Array.isArray(record.domains) ? record.domains : [],
    companies: Array.isArray(record.companies) ? record.companies : [],
    labels: Array.isArray(record.labels) ? record.labels : [],
  }
}

export function getMailLessons(store, userId) {
  const lessons = read(store, userId)
  return { ...lessons, domains: new Set(lessons.domains), companies: new Set(lessons.companies) }
}

const labelOf = (raw, now) => ({ mailId: line(raw.mailId, 300), label: line(raw.label, 20), text: line(raw.text, 300), sender: line(raw.sender, 120), at: toIso(now) })

//   lesson: { domains?, companies?, labels? }
export function learn(store, userId, lesson, now = new Date()) {
  const was = read(store, userId)
  const fresh = (lesson.labels ?? []).map((raw) => labelOf(raw, now)).filter((one) => one.mailId && one.label)
  const relabelled = new Set(fresh.map((one) => one.mailId))
  store.mailLabels.set(userId, {
    domains: [...new Set([...was.domains, ...(lesson.domains ?? [])])],
    companies: [...new Set([...was.companies, ...(lesson.companies ?? [])])],
    labels: [...was.labels.filter((one) => !relabelled.has(one.mailId)), ...fresh].slice(-MAX_LABELS),
  })
}

// Lets a sender's mail be filed again.
export function forgetSender(store, userId, domain) {
  const was = read(store, userId)
  store.mailLabels.set(userId, { ...was, domains: was.domains.filter((one) => one !== domain) })
}
