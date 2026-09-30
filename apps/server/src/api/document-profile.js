import { saveDocumentTex, keepProfileHeader } from '@jobdekho/store/documents.js'
import { readDocument } from '../documents/read.js'
import { documentStore } from '../documents/store.js'
import { documentViewFor } from '../documents/view.js'
import { headerUpdate } from '../documents/profile-header.js'
import { NO_DOCUMENT } from './documents.js'

const ACTIONS = ['preview', 'apply', 'keep']
const NOTHING = 'Nothing to update: the header already matches your profile, or it is no longer the template\'s header.'

// A header declined against an older profile is forgotten once one is
// applied, or it would hide the offer again if the profile ever went back
// to that older version.
async function applyHeader(store, userId, id, tex) {
  const saved = await saveDocumentTex(store, userId, id, { tex, by: 'profile' })
  return saved?.headerKept ? keepProfileHeader(store, userId, id, null) : saved
}

// A document's header brought up to date with the person's profile, which
// only ever happens on their word: a document is their own source from its
// first draft on (see documents/profile-header.js for what counts as the
// header). Tests decorate `documentStore` with a fake before ready(), as for
// the other document routes.
//
// { action }:
//   preview  { fields, tex }, the source it would save, for the person to
//            review as a diff; nothing is saved
//   apply    that source as a new version by 'profile', answered with the
//            document
//   keep     the document's header stays as it is, and the offer is not
//            made again until the profile changes; answered with the
//            document
export async function documentProfileRoutes(app) {
  const store = app.hasDecorator('documentStore') ? app.documentStore : documentStore()
  const auth = { preHandler: app.requireAuth }

  app.post('/api/documents/:id/profile-header', auth, async (request, reply) => {
    const userId = request.user.sub
    const action = request.body?.action
    if (!ACTIONS.includes(action)) return reply.code(400).send({ error: 'Say whether to preview, apply or keep the header from your profile.' })
    const doc = await readDocument(store, userId, request.params.id)
    if (!doc) return reply.code(404).send({ error: NO_DOCUMENT })
    const profile = await app.dashboard.getProfile(userId)
    const update = headerUpdate(doc.tex, profile)
    if (!update) return reply.code(409).send({ error: NOTHING })
    if (action === 'preview') return { fields: update.fields, tex: update.tex }
    const done = action === 'keep'
      ? await keepProfileHeader(store, userId, doc.id, update.rendered)
      : await applyHeader(store, userId, doc.id, update.tex)
    return done ? documentViewFor(done, profile) : reply.code(404).send({ error: NO_DOCUMENT })
  })
}
