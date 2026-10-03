// The one AI call each person has running, whatever started it, held in
// memory for as long as it takes. Concurrent CLI runs fight over one
// sign-in (the race errors.js calls busy), so a second call is refused, not
// started beside the first: a question, a job action, a combined action or
// a document edit, in any chat.
//
//   { chatId, kind: 'question' | 'action' | 'combined' | 'edit', label, startedAt,
//     provider, stage, web, text, question?, postingId?, action? }
//
// The browser that asked watches its own stream, but a page reloaded
// mid-answer has none: it reads this instead, so the thinking card shows
// again in the chat it belongs to, with how long it has been going and the
// answer so far. A failure is kept for the chat it was asked in, until that
// chat asks again or is cleared, so it lands as a missed card there and
// never in another chat. Nothing here is written to disk: a restart ends
// every call anyway.
export const CALL_KINDS = ['question', 'action', 'combined', 'edit']

const running = new Map()
const switches = new Map()
const failed = new Map()

const iso = (ms) => new Date(ms).toISOString()
const failuresIn = (userId) => failed.get(userId) ?? failed.set(userId, new Map()).get(userId)

// The reply is clamped to this when it lands (see parse.js), so the text so
// far never needs to be longer.
const MAX_TEXT = 4000

// False when this person already has a call running, anywhere.
export function beginCall(userId, { chatId, kind, label, ...detail }, now = Date.now()) {
  if (running.has(userId)) return false
  failuresIn(userId).delete(chatId)
  running.set(userId, { chatId, kind, label, startedAt: iso(now), provider: null, stage: 'start', web: false, text: '', ...detail })
  switches.set(userId, new AbortController())
  return true
}

export function busyCall(userId) {
  const entry = running.get(userId)
  return entry ? { ...entry } : null
}

// What the call listens to for a stop. A stop ends it with kind 'stopped',
// which is not a failure to report.
export const stopSignal = (userId) => switches.get(userId)?.signal ?? null

// Stops the running call when it is in `chatId`: false when nothing runs
// there. The running call is always in one known chat.
export function stopCall(userId, chatId) {
  const entry = running.get(userId)
  const control = switches.get(userId)
  if (!entry || entry.chatId !== chatId || !control || control.signal.aborted) return false
  control.abort()
  return true
}

// What the stream says, kept so a watcher that is not the stream sees the
// same: which CLI is answering, where it has got to, whether the question
// went on to the web, and a combined action's own progress label.
export function noteEvent(userId, event) {
  const entry = running.get(userId)
  if (!entry || !event) return
  if (event.event === 'start') entry.provider = event.provider
  if (event.event === 'text') entry.text = (event.text ?? `${entry.text}${event.add ?? ''}`).slice(0, MAX_TEXT)
  if (event.stage) entry.stage = event.stage
  if (event.stage === 'web') entry.web = true
  if (typeof event.label === 'string') entry.label = event.label
}

// `error` is the sentence the person should read, or null for an answer or
// a stop. Resolves the call that ended, or null when none was running.
export function endCall(userId, error = null, now = Date.now()) {
  const entry = running.get(userId) ?? null
  running.delete(userId)
  switches.delete(userId)
  if (entry && error) {
    const { chatId, kind, label, question = null, postingId, action } = entry
    failuresIn(userId).set(chatId, { kind, label, question, error, at: iso(now), ...(postingId ? { postingId, action } : {}) })
  }
  return entry
}

// Every chat's missed call, by chat id.
export const failuresOf = (userId) => Object.fromEntries(failuresIn(userId))

// A cleared or deleted chat keeps no missed card.
export const forgetFailure = (userId, chatId) => failuresIn(userId).delete(chatId)
