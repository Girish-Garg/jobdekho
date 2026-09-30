import { MAX_TURNS, filedFrom, summaryOf, newestFirst } from './chat-conversation.js'

// The conversations the person filed away with "Start a new one", newest
// first, so they can open one again, carry on with it, or find what the AI
// made in it. Kept in a file of their own (see open.js) rather than beside
// the current conversation: a question is asked far more often than a
// conversation is filed, and each answer should rewrite only the one
// conversation it belongs to, not every one before it.
//
//   { conversations: [{ id, title, startedAt, endedAt, turns }] }
//
// Capped like every list the person grows by using the tool: past
// MAX_FILED the conversation with the oldest last activity is dropped, and
// any change it still offered goes with it.
export const MAX_FILED = 50

export const filedConversations = (store, userId) => store.chatArchive?.get(userId)?.conversations ?? []

export function writeFiled(store, userId, list) {
  store.chatArchive.set(userId, { conversations: newestFirst(list).slice(0, MAX_FILED) })
}

export async function listConversations(store, userId) {
  return filedConversations(store, userId).map(summaryOf)
}

export async function getConversation(store, userId, id) {
  const found = filedConversations(store, userId).find((c) => c.id === id)
  return found ? { ...found, turnCount: found.turns.length } : null
}

export async function deleteConversation(store, userId, id) {
  const list = filedConversations(store, userId)
  const kept = list.filter((c) => c.id !== id)
  if (kept.length === list.length) return false
  writeFiled(store, userId, kept)
  return true
}

// An answer that landed after its conversation was filed away. It joins
// that conversation; if there is none by that id (it had no saved turns
// when it was filed, so nothing was kept, or the cap dropped it since) the
// answer is filed as a conversation of its own rather than lost.
export async function appendToFiled(store, userId, id, turn) {
  const list = filedConversations(store, userId)
  const found = list.find((c) => c.id === id)
  const grown = found
    ? { ...found, turns: [...found.turns, turn].slice(-MAX_TURNS), endedAt: turn.createdAt ?? found.endedAt }
    : filedFrom({ id, startedAt: turn.createdAt ?? null, turns: [turn] })
  writeFiled(store, userId, [grown, ...list.filter((c) => c.id !== id)])
  return grown.turns
}
