import { DOCUMENT_KINDS } from '@jobdekho/store/documents.js'
import { checkTex } from '../resume/guard/check.js'
import { MAX_TEX } from '../resume/guard/raw.js'
import { documentFactFlags } from '../documents/fact-flags.js'
import { text } from './profile-op-values.js'
import { applyEdits } from './document-edits.js'

// A model sometimes wraps the source it was asked for in a markdown fence
// even inside a JSON string; the fence is not LaTeX and would not compile.
const FENCE = /^```[a-z]*[ \t]*\r?\n([\s\S]*?)\r?\n?```$/i

// Ends in exactly one newline, as a saved .tex file does, so a rewrite that
// differs from the document only in trailing space reads as no change.
function cleanTex(value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  const tex = (FENCE.exec(trimmed)?.[1] ?? trimmed).trim()
  return tex && tex.length < MAX_TEX ? `${tex}\n` : ''
}

const NEW_NEEDS_WHOLE = 'The change could not be made: a new document has no text to edit yet, so it has to be written whole. Ask for it again.'

// The proposed source: the open document with the model's targeted edits
// applied (see document-edits.js), or a whole source the model wrote, which
// is right for a new document and for a restyle that changes nearly every
// line. Edits win when a reply carries both. Null for nothing usable.
function sourceOf(raw, open) {
  if (Array.isArray(raw?.edits) && raw.edits.length) {
    if (!open) return { refused: NEW_NEEDS_WHOLE }
    const edited = applyEdits(open.tex, raw.edits, open.name)
    if (edited.refused) return edited
    const tex = cleanTex(edited.tex)
    return tex ? { tex, editCount: raw.edits.length } : null
  }
  const tex = cleanTex(raw?.tex)
  return tex ? { tex } : null
}

// A new source for the document open on the resume page, or for a new one.
// Only the open document can be changed: it is the only one whose text the
// model saw. A source the context had to cut is not changed either (see
// context-pages.js), since its edits could not be checked against the
// whole of it.
//
// Stored whole whichever way it was asked for, with the guard's verdict on
// it (`problems`: a card with any cannot be applied), the claims it makes
// that the record and the current text do not (`factFlags`), `editCount`
// when it was built from edits, and `baseAt`, the moment the document's
// text last changed, so Apply can tell whether the person edited it since.
// Edits that do not fit the source are kept as a refused card saying why,
// so the person sees what was meant and why it is not there to apply.
//
//   { kind: 'document', documentId, documentKind, name, tex, baseAt, factFlags, problems, editCount? }
//   { kind: 'document', documentId, documentKind, name, baseAt, status: 'refused', reason }
export function validateDocumentProposal(raw, context) {
  const open = context.document
  const documentId = raw?.documentId ?? null
  if (documentId !== null && (!open || documentId !== open.id || open.truncated)) return null
  const built = sourceOf(raw, documentId ? open : null)
  if (!built || (documentId && built.tex?.trim() === open.tex.trim())) return null
  // An existing document keeps its name: renaming is the person's to do,
  // and a rename made after this proposal must survive its Apply.
  const target = documentId
    ? { documentId, documentKind: open.kind, name: open.name, baseAt: open.baseAt }
    : newTarget(raw.documentKind, text(raw.name, 120))
  if (built.refused) return { kind: 'document', ...target, status: 'refused', reason: built.refused }
  return {
    kind: 'document', ...target, tex: built.tex,
    factFlags: documentFactFlags({ tex: built.tex, profile: context.record, currentTex: documentId ? open.tex : '' }),
    problems: checkTex(built.tex).problems,
    ...(built.editCount ? { editCount: built.editCount } : {}),
  }
}

function newTarget(kind, name) {
  const documentKind = DOCUMENT_KINDS.includes(kind) ? kind : 'resume'
  return { documentId: null, documentKind, name: name || (documentKind === 'resume' ? 'Resume' : 'Cover letter'), baseAt: null }
}
