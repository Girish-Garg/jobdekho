import { parseJsonObject } from '../ai/loose-json.js'
import { validateActions } from './actions.js'
import { validateRefs } from './refs.js'
import { validateProposals } from './proposals.js'

// The reply is shown straight in the panel, so it is clamped to a size the
// panel was designed for rather than trusted as is - the same reasoning
// cover-letter-parse.js applies to the letter it reads back.
const MAX_REPLY = 4000

// A reply that is only a proposal still needs a line above its card.
const PROPOSAL_ONLY = 'Here is a change you can apply.'

// Null when there is nothing to show, which the caller reports as an
// unreadable reply (see run.js); actions, refs and proposals always come
// back as validated lists, empty when the model offered nothing or offered
// only junk. `web` is true only for a literal true: anything else is no
// search. `context` is what the prompt carried, the only source a ref may
// point into and the record a proposal is checked against.
//
// Filter and sort actions belong to the feed: on any other page there is
// no filter bar for them to change, so they are dropped there.
export function parseChatReply(raw, context) {
  const obj = parseJsonObject(raw)
  if (!obj) return null
  const onFeed = !context?.page || context.page === 'postings'
  const proposals = validateProposals(obj.proposals, context)
  const given = typeof obj.reply === 'string' ? obj.reply.trim().slice(0, MAX_REPLY) : ''
  const reply = given || (proposals.length ? PROPOSAL_ONLY : '')
  if (!reply) return null
  return {
    reply,
    actions: onFeed ? validateActions(obj.actions) : [],
    refs: validateRefs(obj.refs, context),
    proposals,
    web: obj.web === true,
  }
}
