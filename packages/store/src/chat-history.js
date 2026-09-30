import { randomUUID } from 'node:crypto'
import { toIso } from './timestamp.js'
import { MAX_TURNS, currentOf } from './chat-conversation.js'
import { appendToFiled } from './chat-archive.js'

// The conversation the chat panel shows, kept the way ai-results.js keeps a
// posting's AI answers: a plain list, oldest dropped once it grows past a
// sane length, so a long-running chat does not grow the file forever while
// a real back-and-forth still fits. "Start a new one" files it away with
// the others the person had (see chat-archive.js) rather than forgetting it,
// so whatever the AI made in it can still be found.
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
// A turn also carries `id`, `page` (where it was asked), `proposals`: the
// profile or document changes it offered, each pending until the person
// presses Apply or Discard (see chat-proposals.js and apps/server/src/chat/
// proposals.js), and `conversationId`, the conversation it was asked in. A
// turn saved before those existed has none of them, which reads as a turn
// that offered nothing.
export { MAX_TURNS }

export async function getCurrentConversation(store, userId) {
  return currentOf(store.chatHistory.get(userId))
}

export async function getChatHistory(store, userId) {
  return currentOf(store.chatHistory.get(userId)).turns
}

// The current conversation's id, given one now if it has none yet (a new
// person, or a conversation saved before ids existed). A question takes it
// when it starts, so its answer is saved to the conversation it was asked
// in even if that one is filed away while the answer is on its way.
export async function currentConversationId(store, userId) {
  const current = currentOf(store.chatHistory.get(userId))
  if (current.id) return current.id
  const id = randomUUID()
  store.chatHistory.set(userId, { ...current, id, startedAt: current.startedAt ?? toIso(new Date()) })
  return id
}

// Into the conversation the turn names when that is no longer the current
// one; into the current one otherwise, including for a turn that names none.
export async function appendChatTurn(store, userId, turn) {
  const current = currentOf(store.chatHistory.get(userId))
  if (turn.conversationId && turn.conversationId !== current.id) return appendToFiled(store, userId, turn.conversationId, turn)
  const turns = [...current.turns, turn].slice(-MAX_TURNS)
  store.chatHistory.set(userId, { ...current, turns })
  return turns
}
