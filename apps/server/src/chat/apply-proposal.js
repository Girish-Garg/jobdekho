import { toIso } from '@jobdekho/store/timestamp.js'
import { findProposal, updateProposal } from '@jobdekho/store/chat-proposals.js'
import { getDocument, createDocument, saveDocumentTex } from '@jobdekho/store/documents.js'
import { textChangedAt } from '@jobdekho/store/document-versions.js'
import { checkTex } from '../resume/guard/check.js'
import { documentView } from '../documents/view.js'
import { applyProfileOps } from './profile-proposal.js'

// The one place a chat proposal changes anything, and only because the
// person pressed Apply. The proposal is read from the saved conversation by
// id (never from the request), checked again against the record or document
// as it is now, applied whole or not at all, and marked applied.
//
// Resolves { status, body }: 200 with { proposal, profile } or
// { proposal, document }; 404 for a proposal no saved turn holds; 409 when
// it was already applied or discarded, or what it changes has changed or
// gone since; 422 with { kind: 'unsafe', problems } for a document the
// LaTeX guard refuses.
const refuse = (status, error, extra = {}) => ({ status, body: { error, ...extra } })
const UNSAFE = 'This version uses LaTeX that JobDekho does not allow, so it cannot be applied. Ask the chat to fix the lines listed.'

// Two clicks on Apply arrive as two requests; without this, both could pass
// the "still pending" check before either marked it applied, and a project
// would be added twice.
const inFlight = new Set()

async function applyProfile({ dashboard, userId, proposal }) {
  const { conflict, profile } = applyProfileOps(proposal.ops ?? [], await dashboard.getProfile(userId))
  if (conflict) return refuse(409, conflict)
  return { profile: await dashboard.upsertProfile(userId, profile) }
}

// The guard runs again here rather than trusting the verdict stored with
// the proposal, so a proposal made before a guard change is held to the
// guard as it is now.
async function applyDocument({ documents, userId, proposal }) {
  const { problems } = checkTex(proposal.tex)
  if (problems.length) return refuse(422, UNSAFE, { kind: 'unsafe', problems })
  if (!proposal.documentId) {
    const doc = await createDocument(documents, userId, {
      name: proposal.name, kind: proposal.documentKind, templateId: null, postingId: null, tex: proposal.tex, by: 'ai',
    })
    return { document: documentView(doc) }
  }
  const current = await getDocument(documents, userId, proposal.documentId)
  if (!current) return refuse(409, `"${proposal.name}" was deleted after this was proposed, so there is nothing to apply it to.`)
  if (textChangedAt(current) !== proposal.baseAt) {
    return refuse(409, `"${current.name}" changed after this was proposed, and applying it would undo that. Nothing was applied; ask again so the change starts from the latest version.`)
  }
  const doc = await saveDocumentTex(documents, userId, current.id, { tex: proposal.tex, by: 'ai' })
  return { document: documentView(doc) }
}

export async function applyProposal({ chat, documents, dashboard, userId, proposalId }) {
  const found = await findProposal(chat, userId, proposalId)
  if (!found) return refuse(404, 'That change is no longer in the conversation.')
  const { proposal } = found
  if (proposal.status === 'applied') return refuse(409, 'This change was already applied.')
  if (proposal.status === 'discarded') return refuse(409, 'This change was discarded. Ask again for a fresh one.')
  const key = `${userId}:${proposalId}`
  if (inFlight.has(key)) return refuse(409, 'This change is already being applied.')
  inFlight.add(key)
  try {
    const apply = proposal.kind === 'profile' ? applyProfile : applyDocument
    const outcome = await apply({ dashboard, documents, userId, proposal })
    if (outcome.status) return outcome
    const marked = await updateProposal(chat, userId, proposalId, { status: 'applied', appliedAt: toIso(new Date()) })
    return { status: 200, body: { proposal: marked, ...outcome } }
  } finally {
    inFlight.delete(key)
  }
}

// Discarding is only a mark on the card; it can be repeated, but an applied
// change cannot be discarded, since it has already happened.
export async function discardProposal({ chat, userId, proposalId }) {
  const found = await findProposal(chat, userId, proposalId)
  if (!found) return refuse(404, 'That change is no longer in the conversation.')
  if (found.proposal.status === 'applied') return refuse(409, 'This change was already applied, so it cannot be discarded.')
  await updateProposal(chat, userId, proposalId, { status: 'discarded' })
  return { status: 204 }
}
