import { resolveChat, ensureChat, NO_CHAT } from '../chat/chat-lookup.js'
import { busyCall, stopCall } from '../chat/in-flight.js'
import { setFollowUp, clearFollowUp } from '../chat/follow-ups.js'
import { ANSWERING, callKindOf, busyRefusal } from '../chat/busy.js'
import { startQuestion } from '../chat/drain.js'
import { askInChat } from '../chat/ask.js'
import { runGuarded } from './guarded.js'

const MAX_MESSAGE = 2000
const messageOf = (body) => String(body?.message || '').trim().slice(0, MAX_MESSAGE)

// What a question is asked with besides its words: the page it was asked
// from ('postings', 'profile', 'resume' or 'settings'; anything else is the
// feed), and on the feed the `filters` and `sort` that say where to look.
// What those hold always comes from the store, never from this body.
const askedWith = (body = {}) => ({ page: body.page, filters: body.filters, sort: body.sort })

// Asking in a chat, one call at a time across every chat (see chat/
// in-flight.js).
//
//   POST /api/chats/:id/messages { message, page?, filters?, sort? }
//     The answer, streamed as NDJSON with Accept: application/x-ndjson (see
//     ai/events.js), ending on the saved turn with `chatId`. A job's or a
//     document's chat is made by its first question. 400 for no question,
//     404 for no such chat, 409 { error, busy } while any call runs.
//   POST /api/chats/:id/stop   { stopped }, false when nothing runs in it
//   POST /api/chats/:id/queue  { message, page?, filters?, sort? }
//     The chat's one waiting follow-up, sent once its running answer is in:
//     { waiting: { message, at } }, a second replacing the first; with no
//     message, { waiting: null }. With nothing running, it is asked now,
//     202 { started: true, chatId }. 409 { error, busy } while another chat
//     is busy.
export async function chatAskRoutes(app) {
  const auth = { preHandler: app.requireAuth }

  app.post('/api/chats/:id/messages', auth, async (request, reply) => {
    const deps = app.chats()
    const userId = request.user.sub
    const message = messageOf(request.body)
    if (!message) return reply.code(400).send({ error: 'Type a question first.' })
    const resolved = await resolveChat(deps, userId, request.params.id)
    if (!resolved) return reply.code(404).send({ error: NO_CHAT })
    const busy = busyCall(userId)
    if (busy) return reply.code(409).send(await busyRefusal(deps, userId, busy))
    const chat = await ensureChat(deps, userId, resolved)
    const call = { chatId: chat.id, kind: callKindOf(chat), label: ANSWERING, question: message }
    return runGuarded(request, reply, deps, call, (emit) => askInChat(deps, { userId, chat, message, body: askedWith(request.body), emit }))
  })

  // Closing the panel or the tab does not stop an answer, on purpose: it is
  // still saved for when the person comes back. Only this does.
  app.post('/api/chats/:id/stop', auth, async (request) => {
    const resolved = await resolveChat(app.chats(), request.user.sub, request.params.id)
    return { stopped: Boolean(resolved?.chat && stopCall(request.user.sub, resolved.chat.id)) }
  })

  app.post('/api/chats/:id/queue', auth, async (request, reply) => {
    const deps = app.chats()
    const userId = request.user.sub
    const message = messageOf(request.body)
    const resolved = await resolveChat(deps, userId, request.params.id)
    if (!resolved) return reply.code(404).send({ error: NO_CHAT })
    if (!message) {
      if (resolved.chat) clearFollowUp(userId, resolved.chat.id)
      return { waiting: null }
    }
    const elsewhere = busyCall(userId)
    if (elsewhere && elsewhere.chatId !== resolved.chat?.id) return reply.code(409).send(await busyRefusal(deps, userId, elsewhere))
    const chat = await ensureChat(deps, userId, resolved)
    // Read again after the last wait, so the running call cannot end between
    // the look and the follow-up being kept, which would leave it never sent.
    const busy = busyCall(userId)
    if (busy && busy.chatId !== chat.id) return reply.code(409).send(await busyRefusal(deps, userId, busy))
    const followUp = { message, body: askedWith(request.body), kind: callKindOf(chat) }
    if (busy) {
      const { at } = setFollowUp(userId, chat.id, followUp)
      return { waiting: { message, at } }
    }
    startQuestion(deps, userId, chat.id, followUp)
    return reply.code(202).send({ started: true, chatId: chat.id })
  })
}
