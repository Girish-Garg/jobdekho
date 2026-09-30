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
const running = new Map()
const failed = new Map()

const iso = (ms) => new Date(ms).toISOString()

// False when this person already has a question in flight.
export function beginQuestion(userId, question, now = Date.now()) {
  if (running.has(userId)) return false
  failed.delete(userId)
  running.set(userId, { question, startedAt: iso(now), provider: null, stage: 'start', web: false })
  return true
}

// What the stream says, kept so a watcher that is not the stream sees the
// same: which CLI is answering, where it has got to, and whether the
// question went on to the web.
export function noteEvent(userId, event) {
  const entry = running.get(userId)
  if (!entry || !event) return
  if (event.event === 'start') entry.provider = event.provider
  if (event.stage) entry.stage = event.stage
  if (event.stage === 'web') entry.web = true
}

// `error` is the sentence the person should read, or null for an answer.
export function endQuestion(userId, error = null, now = Date.now()) {
  const entry = running.get(userId)
  running.delete(userId)
  if (entry && error) failed.set(userId, { question: entry.question, error, at: iso(now) })
}

export function questionState(userId) {
  const failure = failed.get(userId) ?? null
  failed.delete(userId)
  const entry = running.get(userId)
  return { pending: entry ? { ...entry } : null, failed: failure }
}
