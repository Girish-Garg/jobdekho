import { toIso } from './timestamp.js'

// Every chat's turns (see chats.js), one map per user from chat id to
//
//   { turns, dropped, clearedAt? }
//
// A turn keeps the shape the chat has always saved (see apps/server/src/
// chat/run.js): { id, page, question, answer, actions, refs, proposals,
// provider, memory, createdAt, web?, webError? }, plus `items`, the
// { jobs, documents } the chat held when it was asked, so a question asked
// about Razorpay stays labelled that way after Writesonic joins the
// comparison. A combined action's card is a turn with `combined`, and a job
// action started from a comparison leaves a turn with `note` (see the
// server's chat/combined-turns.js).
//
// A chat keeps its newest MAX_CHAT_TURNS turns. Past that the oldest go and
// `dropped` records that this happened, so the chat says older messages
// were removed instead of losing them silently. `clearedAt` is when the
// person last cleared the chat: its job results from before then stay with
// the job, and no longer show in the chat.
export const MAX_CHAT_TURNS = 200
const EMPTY = { turns: [], dropped: false }

const mine = (store, userId) => store.chatMessages.get(userId) ?? {}

export async function getChatMessages(store, userId, chatId) {
  return { ...EMPTY, ...mine(store, userId)[chatId] }
}

export async function appendChatTurn(store, userId, chatId, turn) {
  const all = mine(store, userId)
  const current = { ...EMPTY, ...all[chatId] }
  const grown = [...current.turns, turn]
  const next = { ...current, turns: grown.slice(-MAX_CHAT_TURNS), dropped: current.dropped || grown.length > MAX_CHAT_TURNS }
  store.chatMessages.set(userId, { ...all, [chatId]: next })
  return next
}

// The turns as they are, with one changed in place (see chat-proposals.js).
export async function replaceChatTurns(store, userId, chatId, turns) {
  const all = mine(store, userId)
  store.chatMessages.set(userId, { ...all, [chatId]: { ...EMPTY, ...all[chatId], turns } })
}

// "Clear this chat": its messages go; nothing removed earlier counts as
// dropped any more, since the person removed them on purpose.
export async function clearChatMessages(store, userId, chatId, now = new Date()) {
  store.chatMessages.set(userId, { ...mine(store, userId), [chatId]: { turns: [], dropped: false, clearedAt: toIso(now) } })
}

export async function deleteChatMessages(store, userId, chatId) {
  const { [chatId]: gone, ...rest } = mine(store, userId)
  if (gone !== undefined) store.chatMessages.set(userId, rest)
}

// Every chat's turns at once, for a reader that searches across chats: a
// proposal by its id, or everything the AI made.
export const allChatMessages = (store, userId) => mine(store, userId)
