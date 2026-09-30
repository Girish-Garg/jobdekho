import { currentOf } from './chat-conversation.js'
import { filedConversations, writeFiled } from './chat-archive.js'

// The changes a chat turn offered (see chat-history.js), found and marked
// by id. A proposal is looked up in the saved conversations and nowhere
// else: the apply route never takes a proposal from a request body, so what
// gets applied is exactly what the server validated and stored when the
// model offered it.
//
// Filed conversations are searched too. Filing one away is not turning its
// offers down, and "Made by AI" exists so the person can get back to them;
// an offer that has gone out of date in the meantime is refused on Apply by
// the same checks against the profile or document as it is now that a
// fresh one goes through (see apps/server/src/chat/apply-proposal.js).
const holds = (turn, proposalId) => (turn.proposals ?? []).some((p) => p.id === proposalId)

export async function findProposal(store, userId, proposalId) {
  const current = currentOf(store.chatHistory.get(userId))
  for (const conversation of [current, ...filedConversations(store, userId)]) {
    for (const turn of conversation.turns) {
      const proposal = (turn.proposals ?? []).find((p) => p.id === proposalId)
      if (proposal) return { turn, proposal, conversationId: conversation.id }
    }
  }
  return null
}

// The turns with the one proposal patched, or null when none of them holds it.
function patched(turns, proposalId, patch, found) {
  if (!turns.some((turn) => holds(turn, proposalId))) return null
  return turns.map((turn) => {
    if (!holds(turn, proposalId)) return turn
    const proposals = turn.proposals.map((p) => (p.id === proposalId ? (found.updated = { ...p, ...patch }) : p))
    return { ...turn, proposals }
  })
}

// Merges `patch` into the one proposal and saves the conversation that
// holds it; null when none does any more (each keeps only its newest turns,
// and only so many are kept).
export async function updateProposal(store, userId, proposalId, patch) {
  const found = { updated: null }
  const current = currentOf(store.chatHistory.get(userId))
  const turns = patched(current.turns, proposalId, patch, found)
  if (turns) {
    store.chatHistory.set(userId, { ...current, turns })
    return found.updated
  }
  const list = filedConversations(store, userId)
  const at = list.findIndex((c) => c.turns.some((turn) => holds(turn, proposalId)))
  if (at === -1) return null
  const next = { ...list[at], turns: patched(list[at].turns, proposalId, patch, found) }
  writeFiled(store, userId, list.map((c, i) => (i === at ? next : c)))
  return found.updated
}
