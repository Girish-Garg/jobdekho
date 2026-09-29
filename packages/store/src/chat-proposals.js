// The changes a chat turn offered (see chat-history.js), found and marked
// by id. A proposal is looked up in the saved conversation and nowhere
// else: the apply route never takes a proposal from a request body, so what
// gets applied is exactly what the server validated and stored when the
// model offered it.
const turnsOf = (store, userId) => store.chatHistory.get(userId)?.turns ?? []

export async function findProposal(store, userId, proposalId) {
  for (const turn of turnsOf(store, userId)) {
    const proposal = (turn.proposals ?? []).find((p) => p.id === proposalId)
    if (proposal) return { turn, proposal }
  }
  return null
}

// Merges `patch` into the one proposal and saves the conversation; null when
// no turn holds it any more (the history keeps only its newest turns).
export async function updateProposal(store, userId, proposalId, patch) {
  let updated = null
  const turns = turnsOf(store, userId).map((turn) => {
    if (!(turn.proposals ?? []).some((p) => p.id === proposalId)) return turn
    const proposals = turn.proposals.map((p) => (p.id === proposalId ? (updated = { ...p, ...patch }) : p))
    return { ...turn, proposals }
  })
  if (updated) store.chatHistory.set(userId, { turns })
  return updated
}
