import { topicsOf, isSensitive } from './topics.js'

// A topic the person keeps asking about, across chats and days, offered as
// a preference they never had to state: "You've asked about pay 4 times
// lately. Remember: Always tell me the pay when we talk about a job?". The
// big assistants rank what stays top of mind by recency and frequency; this
// counts the same two things on this computer, from the person's own
// questions only, never from a posting, a reply or a document, so nothing a
// job ad says can plant one (the 2026 memory-poisoning work).
const HALF_LIFE_DAYS = 14
// Three mentions within a week or so: older ones count for less, so three
// spread over a month fall short, and two never reach it.
const ENOUGH = 2.5
const SPREAD = 2
const COOLDOWN_DAYS = 30
const MAX_DISMISSALS = 2
const PENDING_DAYS = 3
const DAY = 24 * 60 * 60 * 1000

export const HABIT_OFFERS = new Map([
  ['pay', { noun: 'pay', text: 'Always tell me the pay when we talk about a job' }],
  ['check', { noun: 'whether jobs are real', text: 'Tell me whether a job looks genuine when we talk about it' }],
  ['place', { noun: 'where jobs are based', text: 'Tell me where each job is based and whether it is remote' }],
  ['company', { noun: 'the companies', text: 'Tell me about the company behind each job: its size, funding and reviews' }],
  ['interview', { noun: 'interviews', text: 'Tell me the interview process when you can find it' }],
  ['experience', { noun: 'the experience jobs ask for', text: 'Tell me how much experience each job asks for' }],
])

// The person's own questions in every chat: [{ chatId, text, at }].
export const questionsFrom = (allMessages = {}) => Object.entries(allMessages).flatMap(([chatId, chat]) => (chat?.turns ?? [])
  .filter((turn) => typeof turn.question === 'string' && !turn.note && !turn.combined)
  .map((turn) => ({ chatId, text: turn.question, at: turn.createdAt })))

const ageDays = (at, now) => Math.max(0, (now - Date.parse(at || 0)) / DAY)
const day = (ms) => new Date(ms).toISOString().slice(0, 10)

// Decayed mentions of `topic`, and the chats and days they were in, this
// question included.
function tally(topic, past, chatId, now) {
  const found = { weight: 1, times: 1, chats: new Set([chatId]), days: new Set([day(now)]) }
  for (const asked of past) {
    if (isSensitive(asked.text) || !topicsOf(asked.text).has(topic)) continue
    found.weight += 0.5 ** (ageDays(asked.at, now) / HALF_LIFE_DAYS)
    found.times += 1
    found.chats.add(asked.chatId)
    if (Number.isFinite(Date.parse(asked.at))) found.days.add(asked.at.slice(0, 10))
  }
  return found
}

// Not offered again while one waits for an answer, nor for a while after a
// Not now, nor ever after two of them; nor when a saved memory covers it.
function quiet(topic, saved, feedback, now) {
  if (saved.some((item) => topicsOf(item.text).has(topic))) return true
  const mine = feedback.filter((entry) => entry.source === 'habit' && entry.topic === topic)
  const dismissed = mine.filter((entry) => entry.outcome === 'dismissed')
  if (dismissed.length >= MAX_DISMISSALS) return true
  if (dismissed.some((entry) => ageDays(entry.at, now) < COOLDOWN_DAYS)) return true
  const last = mine.at(-1)
  return last?.outcome === 'offered' && ageDays(last.at, now) < PENDING_DAYS
}

const sentenceAbout = (message, topic) => (String(message).match(/[^.!?\n]+[.!?]?/g) ?? [])
  .map((s) => s.trim()).find((s) => s.length >= 4 && topicsOf(s).has(topic)) ?? String(message).slice(0, 200)

// { text, scope, quote, source: 'habit', topic, why }, or null.
export function spotHabit({ message, chatId, past = [], saved = [], feedback = [], now = Date.now() }) {
  if (isSensitive(message)) return null
  const asked = topicsOf(message)
  let best = null
  for (const [topic, offer] of HABIT_OFFERS) {
    if (!asked.has(topic) || quiet(topic, saved, feedback, now)) continue
    const found = tally(topic, past, chatId, now)
    if (found.weight < ENOUGH || Math.max(found.chats.size, found.days.size) < SPREAD) continue
    if (!best || found.weight > best.found.weight) best = { topic, offer, found }
  }
  if (!best) return null
  const { topic, offer, found } = best
  const why = `You've asked about ${offer.noun} ${found.times} times lately.`
  return { text: offer.text, scope: 'jobs', quote: sentenceAbout(message, topic), source: 'habit', topic, why }
}
