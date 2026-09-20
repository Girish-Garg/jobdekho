// One conversation per user, kept the way ai-results.js keeps a posting's AI
// answers: a plain list, oldest dropped once it grows past a sane length, so
// a long-running chat does not grow the file forever while a real
// back-and-forth still fits. There is one conversation, not many, because
// "start a new one" is a request to forget the old one, not to file it away.
//
// A turn is { question, answer, actions, provider, createdAt }: what was
// asked, what came back, the offered actions (see apps/server/src/chat/
// actions.js), and which CLI answered - the same shape the chat route
// returns to the browser, saved as is.
export const MAX_TURNS = 20

export async function getChatHistory(store, userId) {
  return store.chatHistory.get(userId)?.turns ?? []
}

export async function appendChatTurn(store, userId, turn) {
  const existing = store.chatHistory.get(userId)?.turns ?? []
  const turns = [...existing, turn].slice(-MAX_TURNS)
  store.chatHistory.set(userId, { turns })
  return turns
}

export async function clearChatHistory(store, userId) {
  store.chatHistory.set(userId, { turns: [] })
}
