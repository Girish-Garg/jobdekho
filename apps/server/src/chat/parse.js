import { parseJsonObject } from '../ai/loose-json.js'
import { validateActions } from './actions.js'

// The reply is shown straight in the panel, so it is clamped to a size the
// panel was designed for rather than trusted as is - the same reasoning
// cover-letter-parse.js applies to the letter it reads back.
const MAX_REPLY = 4000

// Null when there is nothing to show, which the caller reports as an
// unreadable reply (see run.js); actions always come back as a validated
// list, empty when the model offered nothing or offered only junk.
export function parseChatReply(raw) {
  const obj = parseJsonObject(raw)
  if (!obj) return null
  const reply = typeof obj.reply === 'string' ? obj.reply.trim().slice(0, MAX_REPLY) : ''
  if (!reply) return null
  return { reply, actions: validateActions(obj.actions) }
}
