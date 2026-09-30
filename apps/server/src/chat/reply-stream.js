import { partialReply } from '../ai/partial-reply.js'
import { textEvent } from '../ai/events.js'

// Throttled so a fast model does not send the browser a line per token.
const EVERY_MS = 120

// The chat's answer as it is written, for the panel to show before it is
// whole: the model's text so far read for its "reply" (see partial-reply.js)
// and sent as what was added since the last line, or whole when it changed
// in a way adding cannot say, as when another CLI took over after a
// sign-in failure. `flush` sends whatever the throttle held back, once the
// call is done, so a search that follows does not sit under a reply
// missing its last words.
export function replyStream(emit, { everyMs = EVERY_MS, now = Date.now } = {}) {
  let sent = ''
  let latest = ''
  let lastAt = -Infinity
  const send = () => {
    if (latest === sent) return
    emit(textEvent(latest.startsWith(sent) ? { add: latest.slice(sent.length) } : { text: latest }))
    sent = latest
    lastAt = now()
  }
  const onText = (raw) => {
    latest = partialReply(raw)
    if (now() - lastAt >= everyMs) send()
  }
  onText.flush = send
  return onText
}
