// One conversation per user, kept the way ai-results.js keeps a posting's AI
// answers: a plain list, oldest dropped once it grows past a sane length, so
// a long-running chat does not grow the file forever while a real
// back-and-forth still fits. There is one conversation, not many, because
// "start a new one" is a request to forget the old one, not to file it away.
//
// A turn is { question, answer, actions, refs, provider, createdAt }: what
// was asked, what came back, the offered actions (see apps/server/src/chat/
// actions.js), the postings the answer named (see chat/refs.js), and which
// CLI answered - the same shape the chat route returns to the browser, saved
// as is. A turn saved before refs existed has none, which reads as no chips.
// A turn whose question also went to the web carries `web`: { answer,
// sources, provider }, shown after the answer from JobDekho's own data; one
// whose search failed carries `webError` instead (see apps/server/src/chat/
// run.js). Turns saved before that have `web: true`, the web's answer in
// `answer` and `sources` beside it, which the panel still reads.
//
// A turn also carries `id`, `page` (where it was asked) and `proposals`: the
// profile or document changes it offered, each pending until the person
// presses Apply or Discard (see chat-proposals.js and apps/server/src/chat/
// proposals.js). A turn saved before those existed has none of the three,
// which reads as a turn that offered nothing.
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
