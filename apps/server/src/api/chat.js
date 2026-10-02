import { answer } from '../ai/ndjson.js'
import { getCurrentConversation, currentConversationId, appendChatTurn } from '@jobdekho/store/chat-history.js'
import { chatStore } from '../chat/store.js'
import { documentStore } from '../documents/store.js'
import { assemblePageContext } from '../chat/page-context.js'
import { runChatTurn } from '../chat/run.js'
import { chatMemory, settleMemory } from '../chat/memory-turn.js'
import { beginQuestion, noteEvent, endQuestion, questionState, stopSignal, stopQuestion } from '../chat/in-flight.js'
import { chatConversationRoutes } from './chat-conversations.js'

const MAX_MESSAGE = 2000
const STILL_ANSWERING = 'Still answering your last question. Its answer will appear in the chat when it is ready.'
const COULD_NOT = 'The assistant could not answer that question.'

// The chat panel, on every page: a conversation that knows what the page
// holds (see chat/page-context.js) without ever taking the client's word
// for what that is, and that proposes changes to the profile and to
// documents without making them (see chat/proposals.js and
// api/chat-proposals.js). Past conversations and what the AI made in them
// are in api/chat-conversations.js. Tests decorate `chatStore`,
// `documentStore` and `cli` with fakes before ready() so no real file or
// CLI is touched.
export async function chatRoutes(app) {
  const store = app.hasDecorator('chatStore') ? app.chatStore : chatStore()
  const documents = app.hasDecorator('documentStore') ? app.documentStore : documentStore()
  const cli = app.hasDecorator('cli') ? app.cli : {}

  await app.register(chatConversationRoutes)

  // The current conversation: { id, turns }. `id` is null only for one no
  // question has been asked in since conversations had ids.
  app.get('/api/chat/history', { preHandler: app.requireAuth }, async (request) => {
    const { id, turns } = await getCurrentConversation(store, request.user.sub)
    return { id, turns }
  })

  // The question being answered right now and the last one that failed
  // unseen (see chat/in-flight.js), for a page that reloaded mid-answer.
  app.get('/api/chat/pending', { preHandler: app.requireAuth }, async (request) => questionState(request.user.sub))

  // Stops the question being answered, from any page: its CLI is ended and
  // nothing is saved. Closing the panel or the tab does not stop it, on
  // purpose: the answer is still saved for when the person comes back.
  app.post('/api/chat/stop', { preHandler: app.requireAuth }, async (request) => ({ stopped: stopQuestion(request.user.sub) }))

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
    // What the person asked the chat to remember, on every page, unless they
    // switched memory off (see chat/memory-turn.js).
    context.memory = await chatMemory(store, userId)
    const { turns: history } = await getCurrentConversation(store, userId)
    // Taken now, so the answer is saved to the conversation it was asked in
    // even if the person files that one away before it lands.
    const conversationId = await currentConversationId(store, userId)
    if (!beginQuestion(userId, message, Date.now(), conversationId)) return reply.code(409).send({ error: STILL_ANSWERING })
    // The turn is saved before the question is marked done, so a watcher
    // that sees it end finds the answer already in the history.
    return answer(request, reply, async (emit) => {
      try {
        const watch = (event) => { noteEvent(userId, event); emit(event) }
        const signal = stopSignal(userId)
        const asked = await runChatTurn({ message, context, history, select: app.ai.select, emit: watch, signal, ...cli })
        // Saved now only when the message itself said "remember"; the rest
        // wait under the answer for the person's Save.
        const turn = { ...asked, memory: await settleMemory(store, userId, message, asked.memory), conversationId }
        await appendChatTurn(store, userId, turn)
        endQuestion(userId)
        return turn
      } catch (err) {
        // A stop is the person's own doing, not a failure to tell them about.
        endQuestion(userId, err?.kind === 'stopped' ? null : err?.kind ? err.message : COULD_NOT)
        throw err
      }
    })
  })
}
