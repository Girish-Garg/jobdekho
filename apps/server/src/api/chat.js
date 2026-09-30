import { answer } from '../ai/ndjson.js'
import { getChatHistory, appendChatTurn, clearChatHistory } from '@jobdekho/store/chat-history.js'
import { chatStore } from '../chat/store.js'
import { documentStore } from '../documents/store.js'
import { assemblePageContext } from '../chat/page-context.js'
import { runChatTurn } from '../chat/run.js'
import { beginQuestion, noteEvent, endQuestion, questionState } from '../chat/in-flight.js'

const MAX_MESSAGE = 2000
const STILL_ANSWERING = 'Still answering your last question. Its answer will appear in the chat when it is ready.'
const COULD_NOT = 'The assistant could not answer that question.'

// The chat panel, on every page: a conversation that knows what the page
// holds (see chat/page-context.js) without ever taking the client's word
// for what that is, and that proposes changes to the profile and to
// documents without making them (see chat/proposals.js and
// api/chat-proposals.js). Tests decorate `chatStore`, `documentStore` and
// `cli` with fakes before ready() so no real file or CLI is touched.
export async function chatRoutes(app) {
  const store = app.hasDecorator('chatStore') ? app.chatStore : chatStore()
  const documents = app.hasDecorator('documentStore') ? app.documentStore : documentStore()
  const cli = app.hasDecorator('cli') ? app.cli : {}

  app.get('/api/chat/history', { preHandler: app.requireAuth }, async (request) => ({
    turns: await getChatHistory(store, request.user.sub),
  }))

  // The question being answered right now and the last one that failed
  // unseen (see chat/in-flight.js), for a page that reloaded mid-answer.
  app.get('/api/chat/pending', { preHandler: app.requireAuth }, async (request) => questionState(request.user.sub))

  // "Start a new one": the person is asking to forget the old conversation,
  // not to file it away, so this clears rather than archiving. Any change
  // still waiting on a card goes with it, unapplied.
  app.delete('/api/chat/history', { preHandler: app.requireAuth }, async (request, reply) => {
    await clearChatHistory(store, request.user.sub)
    reply.code(204).send()
  })

  // Send Accept: application/x-ndjson to watch it happen (see ai/events.js).
  // `page` says which page asked ('postings', 'profile', 'resume' or
  // 'settings'; anything else is the feed); on the feed `filters`, `sort`
  // and `openPostingId` say where to look, on the resume page `documentId`
  // says which document is open. What those hold always comes from the
  // store, never from this body.
  app.post('/api/chat', { preHandler: app.requireAuth }, async (request, reply) => {
    const userId = request.user.sub
    const message = String(request.body?.message || '').trim().slice(0, MAX_MESSAGE)
    if (!message) return reply.code(400).send({ error: 'Type a question first.' })
    const context = await assemblePageContext({
      dashboard: app.dashboard, documents, detect: app.ai.detect, userId, body: request.body ?? {}, question: message,
    })
    const history = await getChatHistory(store, userId)
    if (!beginQuestion(userId, message)) return reply.code(409).send({ error: STILL_ANSWERING })
    // The turn is saved before the question is marked done, so a watcher
    // that sees it end finds the answer already in the history.
    return answer(request, reply, async (emit) => {
      try {
        const watch = (event) => { noteEvent(userId, event); emit(event) }
        const turn = await runChatTurn({ message, context, history, select: app.ai.select, emit: watch, ...cli })
        await appendChatTurn(store, userId, turn)
        endQuestion(userId)
        return turn
      } catch (err) {
        endQuestion(userId, err?.kind ? err.message : COULD_NOT)
        throw err
      }
    })
  })
}
