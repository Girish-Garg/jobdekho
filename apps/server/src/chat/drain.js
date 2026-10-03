import { getChat } from '@jobdekho/store/chats.js'
import { beginCall, endCall } from './in-flight.js'
import { takeFollowUp } from './follow-ups.js'
import { ANSWERING, failureSentence } from './busy.js'
import { askInChat } from './ask.js'

// Ends a call, then sends the follow-up its chat had waiting, if any. Both
// happen in one turn of the event loop, so the follow-up takes the free slot
// before any request that arrives now: it was asked for before them.
export function finishCall(deps, userId, chatId, error = null) {
  endCall(userId, error)
  const next = takeFollowUp(userId, chatId)
  if (next) startQuestion(deps, userId, chatId, next)
}

async function askFollowUp(deps, userId, chatId, { message, body }) {
  const chat = await getChat(deps.store, userId, chatId)
  if (!chat) throw new Error('The chat was deleted before its follow-up could be sent.')
  return askInChat(deps, { userId, chat, message, body })
}

// A question asked with no stream to watch it: a follow-up whose answer
// came in, or one queued while nothing was running. A browser follows it
// the way it follows a call after a reload, through GET /api/chats/pending,
// and finds the turn in the chat when it ends. False when another call
// holds the slot.
export function startQuestion(deps, userId, chatId, { message, body = {}, kind = 'question' }) {
  if (!beginCall(userId, { chatId, kind, label: ANSWERING, question: message })) return false
  askFollowUp(deps, userId, chatId, { message, body }).then(
    () => finishCall(deps, userId, chatId),
    (err) => {
      if (failureSentence(err) && !err?.kind) deps.log?.error?.(err)
      finishCall(deps, userId, chatId, failureSentence(err))
    },
  )
  return true
}
