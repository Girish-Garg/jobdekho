import { listDocuments, createDocument, deleteDocument, DOCUMENT_KINDS } from '@jobdekho/store/documents.js'
import { readDocument } from '../documents/read.js'
import { documentStore } from '../documents/store.js'
import { documentView, documentViewFor } from '../documents/view.js'
import { firstDraft } from '../documents/first-draft.js'
import { listTemplates, LETTER_TEMPLATES } from '../resume/templates/registry.js'

export const NO_DOCUMENT = 'That document is not there any more.'

// The person's resumes and cover letters as LaTeX sources they own (see
// packages/store/src/documents.js): listed, opened, created from a template
// and deleted here; edited in document-edits.js; compiled and downloaded in
// document-files.js. Tests decorate `documentStore` with a fake before
// ready() so no real file is touched.
export async function documentRoutes(app) {
  const store = app.hasDecorator('documentStore') ? app.documentStore : documentStore()
  const auth = { preHandler: app.requireAuth }

  // Every layout a new document can start from, each marked with the kind
  // of document it makes.
  app.get('/api/documents/templates', auth, async () => ({
    templates: [
      ...listTemplates().map((t) => ({ ...t, kind: 'resume' })),
      ...LETTER_TEMPLATES.map((t) => ({ ...t, kind: 'cover-letter' })),
    ],
  }))

  app.get('/api/documents', auth, async (request) => ({ documents: await listDocuments(store, request.user.sub) }))

  // With `profileHeader`, which says whether the person's profile would now
  // write the header differently (see document-profile.js).
  app.get('/api/documents/:id', auth, async (request, reply) => {
    const userId = request.user.sub
    const doc = await readDocument(store, userId, request.params.id)
    if (!doc) return reply.code(404).send({ error: NO_DOCUMENT })
    const bodies = ['1', 'true'].includes(String(request.query?.bodies ?? ''))
    return documentViewFor(doc, await app.dashboard.getProfile(userId), { bodies })
  })

  // A first draft from a template, with no AI call (see documents/
  // first-draft.js). `postingId` ties the document to a job; with `fromPlan`
  // the draft is that job's saved tailoring plan.
  app.post('/api/documents', auth, async (request, reply) => {
    const userId = request.user.sub
    const body = request.body ?? {}
    if (!DOCUMENT_KINDS.includes(body.kind)) return reply.code(400).send({ error: 'Say whether this is a resume or a cover letter.' })
    const postingId = typeof body.postingId === 'string' && body.postingId ? body.postingId : null
    const draft = await firstDraft(app.dashboard, userId, {
      kind: body.kind, templateId: body.templateId, postingId, fromPlan: body.fromPlan === true,
    })
    if (draft.error) return reply.code(draft.status).send({ error: draft.error })
    const name = typeof body.name === 'string' && body.name.trim() ? body.name : draft.name
    const doc = await createDocument(store, userId, {
      name, kind: body.kind, templateId: draft.templateId, postingId, tex: draft.tex, by: 'template',
    })
    return reply.code(201).send(documentView(doc))
  })

  app.delete('/api/documents/:id', auth, async (request, reply) => {
    const gone = await deleteDocument(store, request.user.sub, request.params.id)
    return gone ? reply.code(204).send() : reply.code(404).send({ error: NO_DOCUMENT })
  })
}
