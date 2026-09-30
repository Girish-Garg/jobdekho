import { getDocument, saveDocumentTex } from '@jobdekho/store/documents.js'
import { fixTemplateLines } from './template-fixes.js'

// A document as it should be read: brought up to date first when it still
// carries a line one of JobDekho's own templates once got wrong (see
// template-fixes.js). The fix is saved as a version by 'template', so it
// shows in the person's version list rather than being a silent rewrite of
// their file; a version restored from before it is fixed again on the next
// read, since the old line is a bug and nothing a person would want back.
// A document without those lines is never written.
export async function readDocument(store, userId, id) {
  const doc = await getDocument(store, userId, id)
  if (!doc) return null
  const fixed = fixTemplateLines(doc.tex)
  if (fixed === doc.tex) return doc
  return saveDocumentTex(store, userId, id, { tex: fixed, by: 'template' })
}
