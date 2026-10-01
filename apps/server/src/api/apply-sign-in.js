import { openSignInWindow, signInWindowOpen, closeSignInWindow } from '../apply/sign-in-window.js'

const GONE = 'That application is not open any more.'
const CANNOT = 'A normal window needs the browser Apply assist uses, and the profile it keeps its sign-ins in.'

// The normal window to sign in from (see apply/sign-in-window.js). Opening it
// ends the open application's browser first, since the two cannot run on the
// one profile; the panel watches for the window to close, then opens Apply
// assist again on the same posting, signed in. `deps.launchPlain` stands in
// for starting a browser in tests.
export function signInRoutes(app, registry, deps) {
  const auth = { preHandler: app.requireAuth }

  app.post('/api/apply/sessions/:id/sign-in-window', auth, async (request, reply) => {
    const s = registry.get(request.params.id)
    if (!s) return reply.code(404).send({ error: GONE })
    const profileDir = deps.keptProfile?.()
    const browser = deps.findBrowser()
    if (!profileDir || !browser) return reply.code(400).send({ error: CANNOT })
    const url = s.pageUrl || s.url
    await registry.close(s.id)
    openSignInWindow({ executable: browser.path, profileDir, url, ...(deps.launchPlain && { launch: deps.launchPlain }) })
    return { open: true, url }
  })

  app.get('/api/apply/sign-in-window', auth, async () => ({ open: signInWindowOpen() }))

  // Closing it is a press of the person's: the browser is asked to close the
  // way its own button would, so the sign-in it holds is written to disk.
  app.delete('/api/apply/sign-in-window', auth, async () => {
    await closeSignInWindow()
    return { open: false }
  })
}
