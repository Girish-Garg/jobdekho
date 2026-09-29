import { getDocument } from '@jobdekho/store/documents.js'
import { documentStore } from '../documents/store.js'
import { documentPdf } from '../documents/pdf.js'
import { compileTex } from '../resume/compile.js'
import { NO_DOCUMENT } from './documents.js'

// A download name from a document name the person typed: plain letters,
// digits, dots, dashes and underscores only, so nothing in it can break out
// of the header's quotes or name a path.
export function downloadName(name) {
  const safe = String(name ?? '').replace(/[^A-Za-z0-9 ._-]+/g, '').trim().replace(/\s+/g, '-').slice(0, 80)
  return safe.replace(/^\.+/, '') || 'document'
}

// The two ways out of JobDekho: the compiled PDF (guarded, then compiled and
// cached, see documents/pdf.js) and the .tex source, which never needs a
// LaTeX install. Tests decorate `resumeCompile`, the same seam the resume
// builder's routes use, so no real pdflatex runs.
export async function documentFileRoutes(app) {
  const store = app.hasDecorator('documentStore') ? app.documentStore : documentStore()
  const compile = app.hasDecorator('resumeCompile') ? app.resumeCompile : compileTex
  const auth = { preHandler: app.requireAuth }

  app.post('/api/documents/:id/pdf', auth, async (request, reply) => {
    const userId = request.user.sub
    const doc = await getDocument(store, userId, request.params.id)
    if (!doc) return reply.code(404).send({ error: NO_DOCUMENT })
    const { pdf, failure } = await documentPdf({ tex: doc.tex, store, userId, compile })
    if (failure) return reply.code(failure.status).send(failure.body)
    reply.type('application/pdf')
    return pdf
  })

  app.get('/api/documents/:id/tex', auth, async (request, reply) => {
    const doc = await getDocument(store, request.user.sub, request.params.id)
    if (!doc) return reply.code(404).send({ error: NO_DOCUMENT })
    reply.type('application/x-tex; charset=utf-8')
    reply.header('content-disposition', `attachment; filename="${downloadName(doc.name)}.tex"`)
    return doc.tex
  })
}
