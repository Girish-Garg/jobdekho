import { ATS, TESTS } from './senders.js'

// What Gmail itself is asked to find (its X-GM-RAW search, the same words
// its search box takes), so only job mail is downloaded and never the whole
// mailbox: mail whose subject speaks of an application, a test, an interview
// or an offer, anything from a hiring system or a test platform, and the
// replies to mails JobDekho sent (by their subjects). Promotions, social,
// chats, spam and trash are left out; "jobs for you" alerts that still come
// through are dropped on their headers before any body is read (see
// prefilter.js).
const SUBJECT = [
  'application', 'applied', 'applying', 'interview', 'interviews', 'assessment', '"coding test"', '"online test"', '"coding challenge"',
  '"coding round"', 'assignment', '"next steps"', '"next round"', 'shortlisted', 'candidature', 'candidacy', '"offer letter"',
  '"job offer"', '"offer of employment"', '"your interest"', '"thank you for applying"', '"thanks for applying"',
]

const FROM = [...ATS.keys(), ...TESTS.keys(), 'jobs-noreply@linkedin.com']

const quoted = (text) => `"${String(text).replace(/["\\]/g, ' ').replace(/\s+/g, ' ').trim()}"`

// Gmail's after: takes a day, so a two-day overlap is given by the caller
// (see run.js) and the mails seen before are dropped by their ids.
const day = (date) => {
  const d = new Date(date)
  return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

//   after: a Date or ISO string, or null for the whole mailbox
//   subjects: the subjects of mails sent from JobDekho, to find replies
export function jobMailQuery({ after = null, subjects = [] } = {}) {
  const sent = subjects.filter(Boolean).slice(-40).map(quoted)
  const any = [`subject:(${SUBJECT.join(' OR ')})`, `from:(${FROM.join(' OR ')})`, ...(sent.length ? [`subject:(${sent.join(' OR ')})`] : [])]
  const since = after ? ` after:${day(after)}` : ''
  return `{${any.join(' ')}} -category:promotions -category:social -in:chats -in:spam -in:trash${since}`
}
