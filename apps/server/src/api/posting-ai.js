import { getChat, touchChat } from '@jobdekho/store/chats.js'
import { appendChatTurn } from '@jobdekho/store/chat-messages.js'
import { ACTIONS } from '../actions/index.js'
import { loadContext } from '../actions/context.js'
import { runAction } from '../actions/run.js'
import { actionMemory } from '../actions/memory-note.js'
import { busyCall, noteEvent, stopSignal } from '../chat/in-flight.js'
import { ACTION_LABELS, busyRefusal } from '../chat/busy.js'
import { jobChat } from '../chat/chat-lookup.js'
import { startedNote } from '../chat/save-turn.js'
import { runGuarded } from './guarded.js'

// A job action pressed in a comparison or a document's chat that holds the
// job runs in the job's own chat; the chat it was pressed in keeps a line
// saying where it went, and the view does not move. Pressed anywhere else,
// it simply runs there.
async function leaveNote(deps, userId, askedIn, { home, posting, kind, label }) {
  if (typeof askedIn !== 'string' || !askedIn || askedIn === home.id) return
  const chat = await getChat(deps.store, userId, askedIn)
  if (!chat?.jobs.includes(posting.id)) return
  await appendChatTurn(deps.store, userId, chat.id, startedNote(chat, { action: kind, label, postingId: posting.id, jobChat: home }))
}

// The AI actions on one posting. Every action shares these two routes; what
// differs between them lives in apps/server/src/actions.
export async function postingAiRoutes(app) {
  const auth = { preHandler: app.requireAuth }

  // What has been answered about this posting so far, every kind at once, so
  // opening a posting is one read however many actions exist. Read from the
  // results file alone: a posting the corpus has since dropped still has its
  // saved answers, and those are the person's to keep.
  app.get('/api/postings/:id/ai', auth, async (request) => ({
    results: await app.dashboard.listAiResults(request.user.sub, request.params.id),
  }))

  // Send Accept: application/x-ndjson to watch it happen (see ai/events.js).
  // A missing CLI, an expired login and a timeout each come back as
  // { error, kind } with a sentence saying what to do (see ai/errors.js).
  // The body, plain or as the stream's last line, is the saved record:
  // { kind, postingId, provider, createdAt, result, chatId, versions,
  // dropped } (see ai-results.js), where `chatId` is the job's own chat, the
  // one it runs in and the only one that shows it. A JSON body of
  // { instruction } asks for a refine instead of a fresh run: the answer
  // already saved goes in as `previous`, and runAction only takes it as a
  // refine when both are there, so an instruction with nothing yet to
  // refine just runs fresh. `chatId` in the body is the chat it was pressed
  // in. It is one call under the one-at-a-time rule like any other: 409
  // { error, busy } while one runs, never queued (see chat/in-flight.js).
  app.post('/api/postings/:id/ai/:kind', auth, async (request, reply) => {
    const { id, kind } = request.params
    const userId = request.user.sub
    // Own keys only: ACTIONS is a plain object, so "constructor" or "toString"
    // in the URL would otherwise find a function and fail as a 500.
    const action = Object.hasOwn(ACTIONS, kind) ? ACTIONS[kind] : null
    if (!action) return reply.code(404).send({ error: 'no such action' })
    const posting = await app.dashboard.getPosting(userId, id)
    if (!posting) return reply.code(404).send({ error: 'no such posting' })
    const { context, error } = await loadContext(app.dashboard, userId, action.context)
    if (error) return reply.code(400).send({ error })
    context.memory = await actionMemory(app.dashboard, userId, action.memoryScope)
    const instruction = String(request.body?.instruction || '').trim()
    const previous = instruction ? (await app.dashboard.getAiResult(userId, id, kind))?.result ?? null : null
    const deps = app.chats()
    const busy = busyCall(userId)
    if (busy) return reply.code(409).send(await busyRefusal(deps, userId, busy))
    const home = await jobChat(deps, userId, posting)
    const call = { chatId: home.id, kind: 'action', label: ACTION_LABELS[kind] ?? kind, postingId: id, action: kind }
    return runGuarded(request, reply, deps, call, async (emit) => {
      await leaveNote(deps, userId, request.body?.chatId, { home, posting, kind, label: call.label })
      const watch = (event) => { noteEvent(userId, event); emit(event) }
      const record = await runAction(action, { posting, context, emit: watch, select: app.ai.select, instruction, previous, signal: stopSignal(userId), ...deps.cli })
      // Found again, so a chat deleted while this ran is made anew rather
      // than the answer landing in no chat.
      const own = await jobChat(deps, userId, posting)
      const saved = await app.dashboard.setAiResult(userId, { ...record, chatId: own.id })
      await touchChat(deps.store, userId, own.id)
      return { ...saved, chatId: own.id }
    })
  })
}
