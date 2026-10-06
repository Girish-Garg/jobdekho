import { createChat } from '@jobdekho/store/chats.js'
import { itemsProblem } from '@jobdekho/store/chat-items.js'
import { NEW_CHAT } from '@jobdekho/store/chat-titles.js'
import { viewOf } from '../chat/chat-view.js'
import { missingItem, emptyTwin, openCompare } from '../chat/chat-items-check.js'

const isId = (value) => typeof value === 'string' && value.length > 0

// POST /api/chats { kind, jobs?, documents? }: a general chat ("New chat",
// up to 3 documents) or a comparison ("Compare jobs", 2 to 5 jobs and up to
// 3 documents). 201 { chat } with its view (see chat/chat-view.js), or 200
// with the empty chat already made for exactly the same, rather than a
// second one. A job's or a document's own chat is never made here: it is
// made on its first message or action (see chat/chat-lookup.js).
//
// 400 for another kind or items the kind may not hold, 404 for a job or a
// document the person does not have.
export async function chatCreateRoutes(app) {
  app.post('/api/chats', { preHandler: app.requireAuth }, async (request, reply) => {
    const deps = app.chats()
    const userId = request.user.sub
    const { kind, jobs = [], documents = [] } = request.body ?? {}
    if (kind === 'job' || kind === 'document') return reply.code(400).send({ error: 'A job\'s or a document\'s own chat is made when it is first used.' })
    if (kind !== 'general' && kind !== 'compare') return reply.code(400).send({ error: 'Say whether this is a general chat or a comparison of jobs.' })
    if (!Array.isArray(jobs) || !Array.isArray(documents) || ![...jobs, ...documents].every(isId)) {
      return reply.code(400).send({ error: 'Name the jobs and documents by their ids.' })
    }
    const problem = itemsProblem(kind, { jobs, documents }, { starting: true })
    if (problem) return reply.code(400).send({ error: problem })
    const missing = await missingItem(deps, userId, { jobs, documents })
    if (missing) return reply.code(404).send({ error: missing })
    const { chat, created } = kind === 'compare'
      ? await openCompare(deps, userId, jobs, documents)
      : await general(deps, userId, documents)
    return reply.code(created ? 201 : 200).send({ chat: await viewOf(deps, userId, chat) })
  })
}

async function general(deps, userId, documents) {
  const twin = await emptyTwin(deps, userId, { kind: 'general', jobs: [], documents })
  return twin ? { chat: twin, created: false } : createChat(deps.store, userId, { kind: 'general', documents, title: NEW_CHAT })
}
