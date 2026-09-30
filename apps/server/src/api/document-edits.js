import { getDocument, saveDocumentTex, revertDocument } from '@jobdekho/store/documents.js'
import { versionAt } from '@jobdekho/store/document-versions.js'
import { documentStore } from '../documents/store.js'
import { documentViewFor } from '../documents/view.js'
import { MAX_TEX } from '../resume/guard/raw.js'
import { NO_DOCUMENT } from './documents.js'

// The person's own changes to a document. Their edit is saved as they wrote
// it, even when the LaTeX guard would refuse it: a half-typed line is a
// normal state for a source being edited, and the guard stands in front of
// every compile (see documents/pdf.js), which is where it matters.
export async function documentEditRoutes(app) {
  const store = app.hasDecorator('documentStore') ? app.documentStore : documentStore()
  const auth = { preHandler: app.requireAuth }

  // { tex, name? }: a new version by 'you', or only a rename when the text
  // is unchanged.
  app.put('/api/documents/:id', auth, async (request, reply) => {
    const { tex, name } = request.body ?? {}
    if (typeof tex !== 'string' || !tex.trim()) return reply.code(400).send({ error: 'The document has no text.' })
    if (tex.length > MAX_TEX) return reply.code(400).send({ error: `The document is longer than ${MAX_TEX} characters.` })
    if (name !== undefined && typeof name !== 'string') return reply.code(400).send({ error: 'name must be text' })
    const userId = request.user.sub
    const doc = await saveDocumentTex(store, userId, request.params.id, { tex, name, by: 'you' })
    return doc ? documentViewFor(doc, await app.dashboard.getProfile(userId)) : reply.code(404).send({ error: NO_DOCUMENT })
  })

  // { at }: that version's text back as the newest version.
  app.post('/api/documents/:id/revert', auth, async (request, reply) => {
    const userId = request.user.sub
    const doc = await getDocument(store, userId, request.params.id)
    if (!doc) return reply.code(404).send({ error: NO_DOCUMENT })
    if (!versionAt(doc, request.body?.at)) return reply.code(404).send({ error: 'That version is no longer kept.' })
    return documentViewFor(await revertDocument(store, userId, doc.id, request.body.at), await app.dashboard.getProfile(userId))
  })
}
