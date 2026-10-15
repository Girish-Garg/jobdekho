import { STAGES } from '@jobdekho/store/tracker-entry.js'

// The Tracker page (see the web's TrackerView.jsx): every application and
// conversation the person keeps track of, from JobDekho or not (see the
// store's tracker.js). The first GET also brings in the postings marked
// Applied before the Tracker existed.
const SAYS = {
  company: 'Type the company first.',
  stage: `A stage is one of ${STAGES.join(', ')}.`,
  missing: 'That entry is no longer in your Tracker.',
}

const text = (max) => ({ type: 'string', maxLength: max })
const fields = {
  company: text(200),
  role: text(200),
  stage: { type: 'string', enum: STAGES },
  note: text(600),
  date: text(40),
  contact: { type: 'object', properties: { name: text(200), email: text(254) } },
}

export async function trackerRoutes(app) {
  const auth = { preHandler: app.requireAuth }
  const answer = (reply, result) => (result.error
    ? reply.code(result.error === 'missing' ? 404 : 400).send({ error: SAYS[result.error] })
    : result)

  app.get('/api/tracker', auth, async (request) => ({ entries: await app.dashboard.listTracker(request.user.sub), stages: STAGES }))

  app.post('/api/tracker', { ...auth, schema: { body: { type: 'object', properties: fields } } }, async (request, reply) => (
    answer(reply, await app.dashboard.addTrackerEntry(request.user.sub, request.body))
  ))

  app.patch('/api/tracker/:id', { ...auth, schema: { body: { type: 'object', properties: fields } } }, async (request, reply) => (
    answer(reply, await app.dashboard.updateTrackerEntry(request.user.sub, request.params.id, request.body))
  ))

  // "Not a job" on an entry the mail scan made: it goes, with every entry
  // from the same sender, and the scan never files that sender again (see
  // the store's tracker-learn.js).
  app.post('/api/tracker/:id/not-job', auth, async (request, reply) => answer(reply, await app.dashboard.notAJob(request.user.sub, request.params.id)))

  app.delete('/api/tracker/:id', auth, async (request, reply) => {
    const gone = await app.dashboard.removeTrackerEntry(request.user.sub, request.params.id)
    return gone ? reply.code(204).send() : reply.code(404).send({ error: SAYS.missing })
  })
}
