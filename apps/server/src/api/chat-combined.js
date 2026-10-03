import { loadContext } from '../actions/context.js'
import { actionMemory } from '../actions/memory-note.js'
import { coverLetter } from '../actions/cover-letter.js'
import { resumeTailor } from '../actions/resume-tailor.js'
import { resolveChat, NO_CHAT } from '../chat/chat-lookup.js'
import { busyCall } from '../chat/in-flight.js'
import { TAILOR_ALL, lettersLabel, busyRefusal } from '../chat/busy.js'
import { tailorForAll } from '../chat/tailor-all.js'
import { lettersForEach } from '../chat/letters-each.js'
import { runGuarded } from './guarded.js'

// The two actions on a whole comparison, each one call slot under the
// one-at-a-time rule (see chat/in-flight.js), streamed like any AI call
// (see ai/events.js) and ending on the turn its card is, with `chatId`:
//
//   POST /api/chats/:id/tailor-all    one resume for what the jobs share (see chat/tailor-all.js)
//   POST /api/chats/:id/letters-each  one letter per job, in turn (see chat/letters-each.js),
//                                     with { event: 'progress', stage: 'letter', index, total, postingId, label }
//                                     as each starts
//
// 404 for no such chat, 400 for a chat that is not a comparison, for one
// whose jobs JobDekho no longer lists, or for a record the action cannot
// work from yet, and 409 { error, busy } while any call runs.
async function comparison(deps, userId, id, fewest) {
  const resolved = await resolveChat(deps, userId, id)
  if (!resolved) return { status: 404, body: { error: NO_CHAT } }
  if (resolved.chat?.kind !== 'compare') return { status: 400, body: { error: 'This works on a comparison of jobs.' } }
  const postings = (await Promise.all(resolved.chat.jobs.map((job) => deps.dashboard.getPosting(userId, job)))).filter(Boolean)
  if (postings.length < fewest) {
    return { status: 400, body: { error: `Only ${postings.length} of these jobs ${postings.length === 1 ? 'is' : 'are'} still listed, which is too few for this.` } }
  }
  const busy = busyCall(userId)
  if (busy) return { status: 409, body: await busyRefusal(deps, userId, busy) }
  return { chat: resolved.chat, postings }
}

export async function chatCombinedRoutes(app) {
  const auth = { preHandler: app.requireAuth }

  app.post('/api/chats/:id/tailor-all', auth, async (request, reply) => {
    const deps = app.chats()
    const userId = request.user.sub
    const { status, body, chat, postings } = await comparison(deps, userId, request.params.id, 2)
    if (!chat) return reply.code(status).send(body)
    const { context, error } = await loadContext(deps.dashboard, userId, resumeTailor.context)
    if (error) return reply.code(400).send({ error })
    const call = { chatId: chat.id, kind: 'combined', label: TAILOR_ALL }
    return runGuarded(request, reply, deps, call, (emit) => tailorForAll(deps, { userId, chat, postings, profile: context.profileEntries, emit }))
  })

  app.post('/api/chats/:id/letters-each', auth, async (request, reply) => {
    const deps = app.chats()
    const userId = request.user.sub
    const { status, body, chat } = await comparison(deps, userId, request.params.id, 1)
    if (!chat) return reply.code(status).send(body)
    const { context, error } = await loadContext(deps.dashboard, userId, coverLetter.context)
    if (error) return reply.code(400).send({ error })
    context.memory = await actionMemory(deps.dashboard, userId, coverLetter.memoryScope)
    const call = { chatId: chat.id, kind: 'combined', label: lettersLabel(1, chat.jobs.length) }
    return runGuarded(request, reply, deps, call, (emit) => lettersForEach(deps, { userId, chat, context, emit }))
  })
}
