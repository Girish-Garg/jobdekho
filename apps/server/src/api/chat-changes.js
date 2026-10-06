import { updateChat, touchChat, deleteChat } from '@jobdekho/store/chats.js'
import { clearChatMessages, deleteChatMessages } from '@jobdekho/store/chat-messages.js'
import { withItem, homeItem, ITEM_TYPES } from '@jobdekho/store/chat-items.js'
import { compareTitle } from '@jobdekho/store/chat-titles.js'
import { toIso } from '@jobdekho/store/timestamp.js'
import { resolveChat, ensureChat, shapeOf, NO_CHAT } from '../chat/chat-lookup.js'
import { chatPage, viewOf } from '../chat/chat-view.js'
import { missingItem, companiesOf, openCompare } from '../chat/chat-items-check.js'
import { forgetFailure } from '../chat/in-flight.js'
import { clearFollowUp } from '../chat/follow-ups.js'

const sameItems = (a, b) => ['jobs', 'documents', 'homeLeftOut'].every((key) => String(a[key] ?? false) === String(b[key] ?? false))

// Changing a chat. Each answers { chat } with its view (see chat/
// chat-view.js), except a delete, 204, and each answers 404 for a chat that
// is not there. Neither clearing nor deleting touches saved job results or
// documents: those stay with their job and in "Made by AI".
//
//   POST   /api/chats/:id/items  { action: 'add' | 'remove', type: 'job' | 'document', id }
//   POST   /api/chats/:id/seen   the person has seen its answers
//   POST   /api/chats/:id/clear  its messages go
//   DELETE /api/chats/:id        it goes from the list, its messages with it
export async function chatChangeRoutes(app) {
  const auth = { preHandler: app.requireAuth }
  const found = async (request, reply) => {
    const resolved = await resolveChat(app.chats(), request.user.sub, request.params.id)
    if (!resolved) reply.code(404).send({ error: NO_CHAT })
    return resolved
  }

  // A job added to a job's own chat starts a comparison of the two and
  // answers that, 201 (200 when the same empty one was already made): the
  // job's chat stays about its job alone. Anything else changes the chat in
  // place by the rules of its kind (see the store's chat-items.js), making a
  // job's or a document's chat first if it had none: 400 for what it may
  // not hold, 404 for an item the person does not have. Its own job or
  // document is left out by its removal and put back by its adding, listed
  // or not. Adding what is there or removing what is not changes nothing.
  app.post('/api/chats/:id/items', auth, async (request, reply) => {
    const deps = app.chats()
    const userId = request.user.sub
    const { action, type, id } = request.body ?? {}
    const resolved = await found(request, reply)
    if (!resolved) return reply
    const base = shapeOf(resolved)
    const lists = withItem(base, { action, type, id })
    const compares = action === 'add' && type === 'job' && base.kind === 'job' && typeof id === 'string' && id !== base.jobs[0]
    if (lists.error && !compares) return reply.code(400).send({ error: lists.error })
    const home = homeItem(base)
    const own = home?.type === type && home.id === id
    const missing = action === 'add' && !own ? await missingItem(deps, userId, { [ITEM_TYPES[type]]: [id] }) : null
    if (missing) return reply.code(404).send({ error: missing })
    if (compares) {
      const { chat, created } = await openCompare(deps, userId, [base.jobs[0], id])
      return reply.code(created ? 201 : 200).send({ chat: await viewOf(deps, userId, chat) })
    }
    if (sameItems(lists, base)) return { chat: (await chatPage(deps, userId, resolved)).chat }
    const chat = await ensureChat(deps, userId, resolved)
    const named = chat.kind === 'compare' && lists.jobs.length
    const title = named ? compareTitle(await companiesOf(deps, userId, lists.jobs)) : chat.title
    return { chat: await viewOf(deps, userId, await updateChat(deps.store, userId, chat.id, { ...lists, title })) }
  })

  app.post('/api/chats/:id/seen', auth, async (request, reply) => {
    const deps = app.chats()
    const resolved = await found(request, reply)
    if (!resolved) return reply
    if (!resolved.chat) return { chat: (await chatPage(deps, request.user.sub, resolved)).chat }
    const chat = await updateChat(deps.store, request.user.sub, resolved.chat.id, { seenAt: toIso(new Date()) })
    return { chat: await viewOf(deps, request.user.sub, chat) }
  })

  // The missed card goes with the messages; a follow-up waiting on the
  // running answer is not a message yet, and still goes once it is in.
  app.post('/api/chats/:id/clear', auth, async (request, reply) => {
    const deps = app.chats()
    const userId = request.user.sub
    const resolved = await found(request, reply)
    if (!resolved) return reply
    if (!resolved.chat) return { chat: (await chatPage(deps, userId, resolved)).chat }
    await clearChatMessages(deps.store, userId, resolved.chat.id)
    forgetFailure(userId, resolved.chat.id)
    return { chat: await viewOf(deps, userId, await touchChat(deps.store, userId, resolved.chat.id)) }
  })

  // An answer still running in it is not stopped: it lands in a new general
  // chat (see chat/save-turn.js), or for a job action in the job's own chat
  // made anew (see posting-ai.js).
  app.delete('/api/chats/:id', auth, async (request, reply) => {
    const deps = app.chats()
    const userId = request.user.sub
    const resolved = await resolveChat(deps, userId, request.params.id)
    if (!resolved?.chat) return reply.code(404).send({ error: NO_CHAT })
    await deleteChat(deps.store, userId, resolved.chat.id)
    await deleteChatMessages(deps.store, userId, resolved.chat.id)
    clearFollowUp(userId, resolved.chat.id)
    forgetFailure(userId, resolved.chat.id)
    return reply.code(204).send()
  })
}
