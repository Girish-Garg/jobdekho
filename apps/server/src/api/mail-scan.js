import { mailWatchFor } from '../mail-scan/watch.js'

// The scan of the person's Gmail into the Tracker (see mail-scan/run.js).
// POST starts one in the background and answers at once, since a first scan
// of a whole mailbox takes minutes; GET says how it is going and how the
// last one went; POST .../undo puts the Tracker back as it was before the
// last scan that changed it. `full` reads the whole mailbox again.
//
// The watch is the one start.js starts the local person's checks on (see
// watch.js), so a scan started here and one the clock starts never overlap.
export async function mailScanRoutes(app) {
  const auth = { preHandler: app.requireAuth }
  const watchFor = (userId) => mailWatchFor({ deps: app.mail, dashboard: app.dashboard, userId, log: app.log })

  app.get('/api/mail/scan', auth, async (request) => watchFor(request.user.sub).status())

  app.post('/api/mail/scan', { ...auth, schema: { body: { type: ['object', 'null'], properties: { full: { type: 'boolean' } } } } }, async (request, reply) => {
    const watch = watchFor(request.user.sub)
    if (!watch.status().connected) return reply.code(409).send({ error: 'Connect Gmail in Settings first.' })
    watch.run({ full: request.body?.full === true })
    return watch.status()
  })

  app.post('/api/mail/scan/undo', auth, async (request) => {
    const outcome = await app.dashboard.undoMailScan(request.user.sub)
    return { ...outcome, status: watchFor(request.user.sub).status() }
  })
}
