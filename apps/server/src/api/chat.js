import { answer } from '../ai/ndjson.js'
import { getChatHistory, appendChatTurn, clearChatHistory } from '@jobdekho/store/chat-history.js'
import { chatStore } from '../chat/store.js'
import { assembleChatContext } from '../chat/context.js'
import { runChatTurn } from '../chat/run.js'

const MAX_MESSAGE = 2000

// The panel on the left of the feed: a conversation that knows what is on
// screen (see chat/context.js) without ever taking the client's word for
// what that is. Tests decorate `chatStore` and `cli` with fakes before
// ready() so no real file or CLI is touched.
export async function chatRoutes(app) {
  const store = app.hasDecorator('chatStore') ? app.chatStore : chatStore()
  const cli = app.hasDecorator('cli') ? app.cli : {}

  app.get('/api/chat/history', { preHandler: app.requireAuth }, async (request) => ({
    turns: await getChatHistory(store, request.user.sub),
  }))

  // "Start a new one": the person is asking to forget the old conversation,
  // not to file it away, so this clears rather than archiving.
  app.delete('/api/chat/history', { preHandler: app.requireAuth }, async (request, reply) => {
    await clearChatHistory(store, request.user.sub)
    reply.code(204).send()
  })

  // Send Accept: application/x-ndjson to watch it happen (see ai/events.js).
  // `filters`, `sort` and `openPostingId` say where to look; the row data
  // itself always comes from the store (see chat/context.js), never from
  // this body.
  app.post('/api/chat', { preHandler: app.requireAuth }, async (request, reply) => {
    const userId = request.user.sub
    const message = String(request.body?.message || '').trim().slice(0, MAX_MESSAGE)
    if (!message) return reply.code(400).send({ error: 'Type a question first.' })
    const { filters, sort, openPostingId } = request.body ?? {}
    const context = await assembleChatContext(app.dashboard, userId, { filters, sort, openPostingId })
    const history = await getChatHistory(store, userId)
    return answer(request, reply, async (emit) => {
      const turn = await runChatTurn({ message, context, history, select: app.ai.select, emit, ...cli })
      await appendChatTurn(store, userId, turn)
      return turn
    })
  })
}
