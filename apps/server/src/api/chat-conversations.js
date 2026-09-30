import { listConversations, getConversation, deleteConversation } from '@jobdekho/store/chat-archive.js'
import { fileAwayConversation, continueConversation } from '@jobdekho/store/chat-switch.js'
import { chatStore } from '../chat/store.js'
import { documentStore } from '../documents/store.js'
import { answeringIn } from '../chat/in-flight.js'
import { madeByAi } from '../chat/made-by-ai.js'

const GONE = 'That conversation is not there any more.'
const ANSWERING = 'A question in this conversation is still being answered. Delete it once the answer is in.'

// The chat's history: the conversations the person filed away with "Start
// a new one" (see packages/store/src/chat-archive.js), and everything the
// AI made across them (see chat/made-by-ai.js). Registered from chat.js,
// beside the conversation it files away. Tests decorate `chatStore` and
// `documentStore` before ready() so no real file is touched.
//
//   GET    /api/chat/conversations               { conversations: [{ id, title, startedAt, endedAt, turnCount }] }
//   GET    /api/chat/conversations/:id           { id, title, startedAt, endedAt, turnCount, turns }
//   POST   /api/chat/conversations               201 { id, turns: [], filed }, "Start a new one"
//   POST   /api/chat/conversations/:id/continue  { id, turns }, the current one filed in its place
//   DELETE /api/chat/conversations/:id           204
//   GET    /api/chat/made-by-ai                  { items } (see chat/made-by-ai.js)
export async function chatConversationRoutes(app) {
  const store = app.hasDecorator('chatStore') ? app.chatStore : chatStore()
  const documents = app.hasDecorator('documentStore') ? app.documentStore : documentStore()
  const auth = { preHandler: app.requireAuth }

  app.get('/api/chat/conversations', auth, async (request) => ({
    conversations: await listConversations(store, request.user.sub),
  }))

  app.get('/api/chat/conversations/:id', auth, async (request, reply) => {
    const found = await getConversation(store, request.user.sub, request.params.id)
    return found ?? reply.code(404).send({ error: GONE })
  })

  // A question still being answered keeps the id of the conversation it
  // was asked in, so its answer is saved there when it lands, filed or not.
  app.post('/api/chat/conversations', auth, async (request, reply) => {
    const { current, filed } = await fileAwayConversation(store, request.user.sub)
    return reply.code(201).send({ id: current.id, turns: current.turns, filed })
  })

  app.post('/api/chat/conversations/:id/continue', auth, async (request, reply) => {
    const current = await continueConversation(store, request.user.sub, request.params.id)
    return current ? { id: current.id, turns: current.turns } : reply.code(404).send({ error: GONE })
  })

  // Refused while its question is being answered: the answer would come
  // back as a conversation of its own a moment after this one was deleted.
  app.delete('/api/chat/conversations/:id', auth, async (request, reply) => {
    const userId = request.user.sub
    if (answeringIn(userId) === request.params.id) return reply.code(409).send({ error: ANSWERING })
    const gone = await deleteConversation(store, userId, request.params.id)
    return gone ? reply.code(204).send() : reply.code(404).send({ error: GONE })
  })

  app.get('/api/chat/made-by-ai', auth, async (request) => ({
    items: await madeByAi({ store, documents, userId: request.user.sub }),
  }))
}
