import { cleanMemoryText, MAX_MEMORY_TEXT } from './memory.js'

// Every memory JobDekho offered and what the person did with it, on this
// computer only: one list per user, oldest first,
//
//   [{ at, source, topic, text, outcome }]
//
// `source` is where the offer came from: the AI's reply, a phrase in the
// person's own message, an explicit "remember", or a habit across chats
// (see the server's memory/spot.js). `outcome` is offered, saved, edited
// (saved after a change) or dismissed (Not now). The habit spotter reads
// it so a dismissed offer waits; and it is the labelled examples a small
// classifier can learn from later, once there are enough, as the posting
// models were. Capped, newest kept.
export const FEEDBACK_SOURCES = ['ai', 'phrase', 'remember', 'habit']
export const FEEDBACK_OUTCOMES = ['offered', 'saved', 'edited', 'dismissed']
export const MAX_FEEDBACK = 1000
const MAX_TOPIC = 40

function entryOf(raw, at) {
  const text = cleanMemoryText(raw?.text).slice(0, MAX_MEMORY_TEXT)
  if (!text || !FEEDBACK_OUTCOMES.includes(raw?.outcome)) return null
  const source = FEEDBACK_SOURCES.includes(raw.source) ? raw.source : 'ai'
  const topic = typeof raw.topic === 'string' && raw.topic ? raw.topic.slice(0, MAX_TOPIC) : null
  return { at, source, topic, text, outcome: raw.outcome }
}

export function readFeedback(store, userId) {
  const list = store.memoryFeedback.get(userId)
  return Array.isArray(list) ? list : []
}

// Appends what is well formed and drops the rest; returns how many it kept.
export function noteFeedback(store, userId, entries, now = new Date()) {
  const at = now.toISOString()
  const kept = entries.map((raw) => entryOf(raw, at)).filter(Boolean)
  if (!kept.length) return 0
  store.memoryFeedback.set(userId, [...readFeedback(store, userId), ...kept].slice(-MAX_FEEDBACK))
  return kept.length
}

// "Forget everything" forgets the offers too: their words were the
// person's.
export function forgetFeedback(store, userId) {
  if (readFeedback(store, userId).length) store.memoryFeedback.set(userId, [])
}
