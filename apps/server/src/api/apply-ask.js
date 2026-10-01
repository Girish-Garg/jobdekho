import { answer } from '../ai/ndjson.js'
import { askOnPage } from '../apply/ask-run.js'

const MAX_MESSAGE = 1500
const GONE = 'That application is not open any more.'
const BUSY = 'Still answering your last message.'
const NOT_YET = 'Wait until the page has loaded and JobDekho has stopped filling, then ask again.'

// The AI beside Apply assist: a message about the form on the page, answered
// as a stream the way the chat's is (see ai/events.js), the reply arriving as
// it is written. One message at a time per application, and Stop ends the
// call where it is. The person's resume goes with it, as with the cover
// letter, because writing an answer about them needs it.
export function askRoutes(app, registry) {
  const auth = { preHandler: app.requireAuth }
  const cli = app.hasDecorator('cli') ? app.cli : {}

  app.post('/api/apply/sessions/:id/ask', auth, async (request, reply) => {
    const s = registry.get(request.params.id)
    if (!s) return reply.code(404).send({ error: GONE })
    const message = String(request.body?.message || '').trim().slice(0, MAX_MESSAGE)
    if (!message) return reply.code(400).send({ error: 'Type a message first.' })
    if (s.asking) return reply.code(409).send({ error: BUSY })
    if (s.closing || s.state === 'starting' || s.state === 'filling') return reply.code(409).send({ error: NOT_YET })
    s.asking = new AbortController()
    const resumeText = await Promise.resolve(app.dashboard.getResumeText?.(request.user.sub)).catch(() => null)
    return answer(request, reply, async (emit) => {
      try {
        return await askOnPage(s, { message, resumeText, select: app.ai.select, emit, signal: s.asking.signal, seams: cli })
      } finally {
        s.asking = null
      }
    })
  })

  app.post('/api/apply/sessions/:id/ask/stop', auth, async (request) => {
    const asking = registry.get(request.params.id)?.asking
    asking?.abort()
    return { stopped: Boolean(asking) }
  })
}
