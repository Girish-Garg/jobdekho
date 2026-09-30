import { offersApply } from '../apply/apply-url.js'
import { canPopOut, placeWindow } from '../apply/window-mode.js'
import { viewOf, pushView } from '../apply/session-view.js'
import { moveTo } from '../apply/session-state.js'
import { fillPage } from '../apply/session-fill.js'

const NO_SESSION = 'That application is not open any more.'

// A route on the open session named in the URL, or a 404 saying it is gone.
const onSession = (registry, act) => async (request, reply) => {
  const s = registry.get(request.params.id)
  if (!s) return reply.code(404).send({ error: NO_SESSION })
  return act(s, request, reply)
}

// Apply assist's REST side: which browser there is, opening and closing the
// one session, and the presses that move the wheel. The live view and the
// person's input travel over the session's socket (apply-socket.js).
export function sessionRoutes(app, registry, deps) {
  const auth = { preHandler: app.requireAuth }

  app.get('/api/apply/browser', auth, async () => {
    const found = deps.findBrowser()
    return { browser: found ? { name: found.name } : null, canPopOut: canPopOut(deps.windowMode()) }
  })

  app.post('/api/apply/sessions', auth, async (request, reply) => {
    const userId = request.user.sub
    const posting = await app.dashboard.getPosting(userId, String(request.body?.postingId ?? ''))
    if (!posting) return reply.code(404).send({ error: 'That posting is not there any more.' })
    if (!offersApply(posting)) return reply.code(400).send({ error: 'Apply assist is not offered for job-board postings: open the posting and apply there.' })
    try {
      const opened = await registry.open({ posting, userId, profile: await app.dashboard.getProfile(userId) })
      if (opened.conflict) {
        const other = opened.conflict.posting
        return reply.code(409).send({ error: `An application is already open: ${other.title} at ${other.company}. Close it first.`, session: viewOf(opened.conflict), token: opened.conflict.token })
      }
      return { session: viewOf(opened.session), token: opened.session.token }
    } catch (err) {
      if (err.code === 'no-browser' || err.code === 'not-offered') return reply.code(400).send({ error: err.message, kind: err.code })
      request.log.warn({ err: String(err?.message).slice(0, 300) }, 'apply browser did not start')
      return reply.code(502).send({ error: `The browser for Apply assist did not start: ${String(err?.message).split('\n')[0].slice(0, 200)}` })
    }
  })

  app.get('/api/apply/sessions/current', auth, async () => {
    const s = registry.current()
    return s ? { session: viewOf(s), token: s.token } : { session: null }
  })

  app.delete('/api/apply/sessions/:id', auth, async (request, reply) => {
    await registry.close(request.params.id)
    return reply.code(204).send()
  })

  // "Fill this page": always a press, never a reaction to a new page.
  app.post('/api/apply/sessions/:id/fill', auth, onSession(registry, (s) => {
    fillPage(s).catch(() => {})
    return { session: viewOf(s) }
  }))

  app.post('/api/apply/sessions/:id/takeover', auth, onSession(registry, (s) => {
    if (s.state === 'filling' || s.state === 'starting') {
      moveTo(s, 'yours', 'took-over')
      pushView(s)
    }
    return { session: viewOf(s) }
  }))

  // Pop out and back in: the same window, moved, with the form as it was.
  app.post('/api/apply/sessions/:id/window', auth, onSession(registry, async (s, request, reply) => {
    if (!canPopOut(s.mode)) return reply.code(400).send({ error: 'This computer runs the Apply browser without a window, so it cannot pop out.' })
    const shown = request.body?.shown === true
    await placeWindow(s.active.cdp, s.mode, shown)
    if (shown) await s.active.page.bringToFront().catch(() => {})
    s.shown = shown
    pushView(s)
    return { session: viewOf(s) }
  }))
}
