import { allChatMessages, replaceChatTurns } from './chat-messages.js'

// The changes a chat turn offered (see chat-messages.js), found and marked
// by id. A proposal is looked up in the saved chats and nowhere else: the
// apply route never takes a proposal from a request body, so what gets
// applied is exactly what the server validated and stored when the model
// offered it.
//
// Every chat is searched, not only the one on screen. Leaving a chat is not
// turning its offers down, and "Made by AI" exists so the person can get
// back to them; an offer that has gone out of date in the meantime is
// refused on Apply by the same checks against the profile or document as
// it is now that a fresh one goes through (see apps/server/src/chat/
// apply-proposal.js).
const holds = (turn, proposalId) => (turn.proposals ?? []).some((p) => p.id === proposalId)

function located(store, userId, proposalId) {
  for (const [chatId, { turns = [] }] of Object.entries(allChatMessages(store, userId))) {
    const turn = turns.find((t) => holds(t, proposalId))
    if (turn) return { chatId, turns, turn }
  }
  return null
}

export async function findProposal(store, userId, proposalId) {
  const found = located(store, userId, proposalId)
  if (!found) return null
  return { turn: found.turn, proposal: found.turn.proposals.find((p) => p.id === proposalId), chatId: found.chatId }
}

// Merges `patch` into the one proposal and saves the chat that holds it;
// null when none does any more (a chat keeps only its newest turns, and a
// cleared or deleted chat keeps none).
export async function updateProposal(store, userId, proposalId, patch) {
  const found = located(store, userId, proposalId)
  if (!found) return null
  let updated = null
  const turns = found.turns.map((turn) => {
    if (turn !== found.turn) return turn
    const proposals = turn.proposals.map((p) => (p.id === proposalId ? (updated = { ...p, ...patch }) : p))
    return { ...turn, proposals }
  })
  await replaceChatTurns(store, userId, found.chatId, turns)
  return updated
}
