import { randomUUID } from 'node:crypto'
import { toIso } from '@jobdekho/store/timestamp.js'
import { getChat, createChat, updateChat, touchChat } from '@jobdekho/store/chats.js'
import { appendChatTurn } from '@jobdekho/store/chat-messages.js'
import { heldItems } from '@jobdekho/store/chat-items.js'
import { NEW_CHAT, questionTitle } from '@jobdekho/store/chat-titles.js'

// Saves a finished turn in the chat it was asked in, and resolves which chat
// that was. A chat deleted while its answer ran has the answer saved to a
// new general chat titled after the question, so nothing paid for is ever
// lost. A general chat still called "New chat" takes its first question as
// its title.
export async function saveTurn(store, userId, chatId, turn) {
  const asked = await getChat(store, userId, chatId)
  const chat = asked ?? (await createChat(store, userId, { kind: 'general', title: questionTitle(turn.question) })).chat
  await appendChatTurn(store, userId, chat.id, turn)
  if (chat.title === NEW_CHAT) await updateChat(store, userId, chat.id, { title: questionTitle(turn.question) })
  else await touchChat(store, userId, chat.id)
  return chat.id
}

const NONE = { actions: [], refs: [], proposals: [], memory: [] }

// A combined action's card, kept as a turn of the comparison it was asked
// in, so it shows at the point it was asked for: the question is what was
// pressed, the answer a line saying what came of it, and `combined` what the
// card lists (see tailor-all.js and letters-each.js).
export function combinedTurn(chat, { question, answer, provider, combined }) {
  return { id: randomUUID(), question, answer, ...NONE, provider, combined, createdAt: toIso(new Date()), items: heldItems(chat) }
}

// What a comparison or a document's chat keeps when a job action pressed in
// it runs in the job's own chat: "Started Is it real? in Razorpay's chat",
// with the chat to link to. Not an answer, so never unseen, and never part
// of what the model reads.
export function startedNote(chat, { action, label, postingId, jobChat }) {
  const note = { kind: 'started', action, label, postingId, chatId: jobChat.id, title: jobChat.title }
  return { id: randomUUID(), note, createdAt: toIso(new Date()), items: heldItems(chat) }
}
