import { currentOf, freshConversation, filedFrom, summaryOf } from './chat-conversation.js'
import { filedConversations, writeFiled } from './chat-archive.js'

// The two ways the current conversation changes: "Start a new one" and
// "Continue this conversation". Both file the current one away first, so
// neither loses anything. A conversation with no saved turns is not filed,
// since there is nothing in it to come back to; a question still being
// answered in it keeps its id and is filed with its answer when that lands
// (see appendToFiled in chat-archive.js).

// Resolves { current, filed }: the fresh conversation, and the summary of
// the one filed away, or null when there was nothing to file.
export async function fileAwayConversation(store, userId, now = new Date()) {
  const current = currentOf(store.chatHistory.get(userId))
  const filed = current.turns.length ? filedFrom(current, now) : null
  if (filed) writeFiled(store, userId, [filed, ...filedConversations(store, userId)])
  const next = freshConversation(now)
  store.chatHistory.set(userId, next)
  return { current: next, filed: filed && summaryOf(filed) }
}

// The filed conversation becomes the current one again, whole, and leaves
// the list; the one it replaces takes its place there. Null when there is
// no such filed conversation.
export async function continueConversation(store, userId, id, now = new Date()) {
  const list = filedConversations(store, userId)
  const picked = list.find((c) => c.id === id)
  if (!picked) return null
  const current = currentOf(store.chatHistory.get(userId))
  const rest = list.filter((c) => c.id !== id)
  writeFiled(store, userId, current.turns.length ? [filedFrom(current, now), ...rest] : rest)
  const next = { id: picked.id, startedAt: picked.startedAt, turns: picked.turns }
  store.chatHistory.set(userId, next)
  return next
}
