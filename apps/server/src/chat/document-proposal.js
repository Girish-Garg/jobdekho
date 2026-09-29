import { DOCUMENT_KINDS } from '@jobdekho/store/documents.js'
import { checkTex } from '../resume/guard/check.js'
import { MAX_TEX } from '../resume/guard/raw.js'
import { documentFactFlags } from '../documents/fact-flags.js'
import { text } from './profile-op-values.js'

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

// A whole new source for the document open on the resume page, or for a new
// one. Only the open document can be rewritten: it is the only one whose
// text the model saw, and a proposal replaces a document whole, so a
// rewrite of any other would be written blind. A source the context had to
// cut is not rewritten either (see context-pages.js).
//
// Stored with the guard's verdict on it (`problems`: a card with any cannot
// be applied) and the claims it makes that the record and the current text
// do not (`factFlags`), and with `baseAt`, the moment the document's text
// last changed, so Apply can tell whether the person edited it since.
//
//   { kind: 'document', documentId, documentKind, name, tex, baseAt, factFlags, problems }
export function validateDocumentProposal(raw, context) {
  const open = context.document
  const documentId = raw?.documentId ?? null
  if (documentId !== null && (!open || documentId !== open.id || open.truncated)) return null
  const tex = cleanTex(raw?.tex)
  if (!tex || (documentId && tex.trim() === open.tex.trim())) return null
  // An existing document keeps its name: renaming is the person's to do,
  // and a rename made after this proposal must survive its Apply.
  const target = documentId
    ? { documentId, documentKind: open.kind, name: open.name, baseAt: open.baseAt }
    : newTarget(raw.documentKind, text(raw.name, 120))
  return {
    kind: 'document', ...target, tex,
    factFlags: documentFactFlags({ tex, profile: context.record, currentTex: documentId ? open.tex : '' }),
    problems: checkTex(tex).problems,
  }
}

function newTarget(kind, name) {
  const documentKind = DOCUMENT_KINDS.includes(kind) ? kind : 'resume'
  return { documentId: null, documentKind, name: name || (documentKind === 'resume' ? 'Resume' : 'Cover letter'), baseAt: null }
}
