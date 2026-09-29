import { parseJsonObject } from '../ai/loose-json.js'
import { validateActions } from './actions.js'
import { validateRefs } from './refs.js'

// The reply is shown straight in the panel, so it is clamped to a size the
// panel was designed for rather than trusted as is - the same reasoning
// cover-letter-parse.js applies to the letter it reads back.
const MAX_REPLY = 4000

// Null when there is nothing to show, which the caller reports as an
// unreadable reply (see run.js); actions and refs always come back as
// validated lists, empty when the model offered nothing or offered only junk.
// `web` is true only for a literal true: anything else is no search.
// `context` is what the prompt carried, the only source a ref may point into.
export function parseChatReply(raw, context) {
  const obj = parseJsonObject(raw)
  if (!obj) return null
  const reply = typeof obj.reply === 'string' ? obj.reply.trim().slice(0, MAX_REPLY) : ''
  if (!reply) return null
  return { reply, actions: validateActions(obj.actions), refs: validateRefs(obj.refs, context), web: obj.web === true }
}
