import { listChats, getChat } from '@jobdekho/store/chats.js'
import { resolveChat, placeholderId, NO_CHAT } from '../chat/chat-lookup.js'
import { viewKit, chatView, chatPage } from '../chat/chat-view.js'
import { chatActivity } from '../chat/chat-results.js'
import { busyCall, failuresOf } from '../chat/in-flight.js'
import { followUpsOf } from '../chat/follow-ups.js'
import { NO_POSTING, NO_DOCUMENT } from '../chat/chat-items-check.js'
import { chatCreateRoutes } from './chat-create.js'
import { chatChangeRoutes } from './chat-changes.js'
import { chatAskRoutes } from './chat-asks.js'
import { chatCombinedRoutes } from './chat-combined.js'

// The chats, each owning its messages, its waiting follow-up and the job
// results asked for in it (see packages/store/src/chats.js). Reading them is
// here; making, changing and deleting them, asking in them and their
// combined actions are in the files registered below. Every route takes the
// chat's id, or for a job's or a document's chat not made yet,
// "job:<postingId>" or "document:<documentId>" (see chat/chat-lookup.js).
//
//   GET /api/chats                          { chats: [view] }, newest first
//   GET /api/chats/for-job/:postingId       { chat, turns, dropped, results }
//   GET /api/chats/for-document/:documentId { chat, turns, dropped, results }
//   GET /api/chats/:id/messages             { chat, turns, dropped, results }
//   GET /api/chats/pending                  { busy, waiting, failed }
//
// A view is described in chat/chat-view.js, results in chat/chat-results.js.
export async function chatRoutes(app) {
  const auth = { preHandler: app.requireAuth }
  for (const routes of [chatCreateRoutes, chatChangeRoutes, chatAskRoutes, chatCombinedRoutes]) await app.register(routes)

  // A chat with nothing in it is never listed: one is made on the way to a
  // first question, and only becomes a chat worth finding once it has one.
  // A chat whose first question is still running or failed is listed.
  app.get('/api/chats', auth, async (request) => {
    const deps = app.chats()
    const userId = request.user.sub
    const chats = await listChats(deps.store, userId)
    const kit = await viewKit(deps, userId, chats.flatMap((chat) => chat.jobs))
    const rows = await Promise.all(chats.map(async (chat) => ({ chat, ...(await chatActivity(deps, userId, chat)) })))
    const shown = ({ chat, messages, results }) => messages.turns.length > 0 || results.length > 0
      || kit.busy?.chatId === chat.id || Boolean(kit.waiting[chat.id] || kit.failed[chat.id])
    return { chats: rows.filter(shown).map(({ chat, lastAt }) => chatView(chat, kit, lastAt)) }
  })

  const page = (missing, idOf) => async (request, reply) => {
    const deps = app.chats()
    const resolved = await resolveChat(deps, request.user.sub, idOf(request.params))
    return resolved ? chatPage(deps, request.user.sub, resolved) : reply.code(404).send({ error: missing })
  }
  app.get('/api/chats/for-job/:postingId', auth, page(NO_POSTING, ({ postingId }) => placeholderId('job', postingId)))
  app.get('/api/chats/for-document/:documentId', auth, page(NO_DOCUMENT, ({ documentId }) => placeholderId('document', documentId)))
  app.get('/api/chats/:id/messages', auth, page(NO_CHAT, ({ id }) => id))

  // The call running now, with the title of the chat it runs in; each
  // chat's waiting follow-up; and each chat's failed call, by chat id: what
  // a page reloaded mid-answer reads instead of the stream it lost.
  app.get('/api/chats/pending', auth, async (request) => {
    const userId = request.user.sub
    const busy = busyCall(userId)
    const chat = busy ? await getChat(app.chats().store, userId, busy.chatId) : null
    return { busy: busy && { ...busy, title: chat?.title ?? null }, waiting: followUpsOf(userId), failed: failuresOf(userId) }
  })
}
