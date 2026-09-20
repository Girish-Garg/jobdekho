import { answer } from '../ai/ndjson.js'
import { ACTIONS } from '../actions/index.js'
import { loadContext } from '../actions/context.js'
import { runAction } from '../actions/run.js'

// The AI actions on one posting. Every action shares these two routes; what
// differs between them lives in apps/server/src/actions.
export async function postingAiRoutes(app) {
  // Tests decorate `cli` with fakes before ready() so no real CLI is spawned.
  const cli = app.hasDecorator('cli') ? app.cli : {}

  // What has been answered about this posting so far, every kind at once, so
  // opening a posting is one read however many actions exist. Read from the
  // results file alone: a posting the corpus has since dropped still has its
  // saved answers, and those are the person's to keep.
  app.get('/api/postings/:id/ai', { preHandler: app.requireAuth }, async (request) => ({
    results: await app.dashboard.listAiResults(request.user.sub, request.params.id),
  }))

  // Send Accept: application/x-ndjson to watch it happen (see ai/events.js).
  // A missing CLI, an expired login and a timeout each come back as
  // { error, kind } with a sentence saying what to do (see ai/errors.js).
  // The body, plain or as the stream's last line, is the saved record:
  // { kind, postingId, provider, createdAt, result, versions, dropped }
  // (see ai-results.js). A JSON body of { instruction } asks for a refine
  // instead of a fresh run: the answer already saved goes in as `previous`,
  // and runAction only takes it as a refine when both are there, so an
  // instruction with nothing yet to refine just runs fresh.
  app.post('/api/postings/:id/ai/:kind', { preHandler: app.requireAuth }, async (request, reply) => {
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
    const instruction = String(request.body?.instruction || '').trim()
    const previous = instruction ? (await app.dashboard.getAiResult(userId, id, kind))?.result ?? null : null
    return answer(request, reply, async (emit) => {
      const record = await runAction(action, { posting, context, emit, select: app.ai.select, instruction, previous, ...cli })
      return app.dashboard.setAiResult(userId, record)
    })
  })
}
