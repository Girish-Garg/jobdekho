// The question each person's chat is answering right now, held in memory for
// as long as the answer takes. The browser that asked watches its own
// stream, but a page reloaded mid-answer has no stream to watch: it asks
// here instead, so the question it sent is still on screen with how long it
// has been going, and the answer appears when it lands. It also keeps a
// person to one question at a time, as the panel does, since a second CLI
// starting beside the first is the sign-in race errors.js calls busy.
//
// A failure is kept until a browser reads it once, so a question that failed
// while nobody was watching says so instead of silently vanishing. Nothing
// here is written to disk: a restart ends every call anyway.
//
// Each question also has a switch that stops it (see stopQuestion), and the
// answer as far as it has been written, so a reloaded page shows that too.
const running = new Map()
const failed = new Map()
const switches = new Map()

const iso = (ms) => new Date(ms).toISOString()

// The reply is clamped to this when it lands (see parse.js), so the text so
// far never needs to be longer.
const MAX_TEXT = 4000

// False when this person already has a question in flight. The question
// belongs to the conversation it was asked in, `conversationId`, which may
// be filed away before the answer lands; a page reloaded meanwhile compares
// it with the current conversation to say where the answer went.
export function beginQuestion(userId, question, now = Date.now(), conversationId = null) {
  if (running.has(userId)) return false
  failed.delete(userId)
  const entry = { question, startedAt: iso(now), provider: null, stage: 'start', web: false, text: '' }
  running.set(userId, conversationId ? { ...entry, conversationId } : entry)
  switches.set(userId, new AbortController())
  return true
}

// What the call listens to for a stop, and the stop itself: false when
// there was nothing to stop. The call then ends with kind 'stopped', which
// is not a failure to report (see endQuestion's caller in api/chat.js).
export const stopSignal = (userId) => switches.get(userId)?.signal ?? null

export function stopQuestion(userId) {
  const control = switches.get(userId)
  if (!control || control.signal.aborted) return false
  control.abort()
  return true
}

// The conversation a question is being answered in right now, if any, so
// it is not deleted from under the answer.
export const answeringIn = (userId) => running.get(userId)?.conversationId ?? null

// What the stream says, kept so a watcher that is not the stream sees the
// same: which CLI is answering, where it has got to, and whether the
// question went on to the web.
export function noteEvent(userId, event) {
  const entry = running.get(userId)
  if (!entry || !event) return
  if (event.event === 'start') entry.provider = event.provider
  if (event.event === 'text') entry.text = (event.text ?? `${entry.text}${event.add ?? ''}`).slice(0, MAX_TEXT)
  if (event.stage) entry.stage = event.stage
  if (event.stage === 'web') entry.web = true
}

// `error` is the sentence the person should read, or null for an answer.
export function endQuestion(userId, error = null, now = Date.now()) {
  const entry = running.get(userId)
  running.delete(userId)
  switches.delete(userId)
  if (entry && error) failed.set(userId, { question: entry.question, error, at: iso(now) })
}

export function questionState(userId) {
  const failure = failed.get(userId) ?? null
  failed.delete(userId)
  const entry = running.get(userId)
  return { pending: entry ? { ...entry } : null, failed: failure }
}
