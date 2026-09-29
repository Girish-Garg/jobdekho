import { randomUUID } from 'node:crypto'
import { validateProfileProposal } from './profile-proposal.js'
import { validateDocumentProposal } from './document-proposal.js'
import { text } from './profile-op-values.js'

// The changes a chat turn offers, validated and stored with the turn (see
// packages/store/src/chat-history.js). The model proposes; the server
// checks every proposal against the person's own records here, stores it as
// 'pending', and nothing changes until the person presses Apply (see
// apply-proposal.js), which reads the proposal back from the saved turn and
// never from the request.
//
//   { id, kind: 'profile' | 'document', summary, status: 'pending', ... }
//
// A page may only propose what its context showed the model: the profile
// and resume pages carry the whole record, so either can change it; only
// the resume page carries a document's source, so only it can rewrite one.
// The feed and settings pages propose nothing.
const MAX_PROPOSALS = 3
const MAX_SUMMARY = 160
const PROFILE_PAGES = new Set(['profile', 'resume'])

function validateOne(item, context) {
  if (item?.kind === 'profile' && PROFILE_PAGES.has(context.page)) return validateProfileProposal(item, context.record)
  if (item?.kind === 'document' && context.page === 'resume') return validateDocumentProposal(item, context)
  return null
}

// The model's one line, as plain text, or a plain default when it gave none.
function summaryOf(raw, body) {
  const given = typeof raw === 'string' ? text(raw, MAX_SUMMARY) : ''
  if (given) return given
  return body.kind === 'document' ? `New version of ${body.name}` : 'Change your profile'
}

export function validateProposals(raw, context) {
  if (!Array.isArray(raw) || !context?.page) return []
  const out = []
  for (const item of raw.slice(0, MAX_PROPOSALS * 2)) {
    // One rewrite of a document per turn: two whole sources for the same
    // page would leave the person choosing between versions blind.
    if (item?.kind === 'document' && out.some((p) => p.kind === 'document')) continue
    const body = validateOne(item, context)
    if (!body) continue
    const { kind, ...rest } = body
    out.push({ id: randomUUID(), kind, summary: summaryOf(item.summary, body), status: 'pending', ...rest })
    if (out.length === MAX_PROPOSALS) break
  }
  return out
}
