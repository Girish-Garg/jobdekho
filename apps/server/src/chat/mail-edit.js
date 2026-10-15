import { findProposal, updateProposal } from '@jobdekho/store/chat-proposals.js'
import { getDocument } from '@jobdekho/store/documents.js'
import { cleanEmail, line } from '@jobdekho/store/tracker-entry.js'
import { lastMailed } from '@jobdekho/store/mail-log.js'
import { bodyOf } from './mail-draft.js'

// The person's own changes to a drafted mail before it goes: the address,
// the subject, the body, and which resume goes with it. Only a draft still
// waiting can change, and what is saved here is exactly what Send sends
// (see mail/send-draft.js). An address typed into the card is the person's
// own, like one typed into the chat.
//
//   input: { to?, subject?, body?, attach? }  attach is a document id or 'none'
//
// Resolves { status, body } like apply-proposal.js: 200 with { proposal }.
const refuse = (status, error) => ({ status, body: { error } })

async function patchOf({ input, documents, mailStore, userId, proposal }) {
  const patch = {}
  if ('to' in input) {
    const to = cleanEmail(input.to)
    if (!to) return { error: refuse(400, 'That is not an email address.') }
    Object.assign(patch, { to, summary: `Mail to ${proposal.name || to}`, mailedBefore: lastMailed(mailStore, userId).get(to) ?? null })
  }
  if ('subject' in input) {
    patch.subject = line(input.subject, 200)
    if (!patch.subject) return { error: refuse(400, 'A mail needs a subject line.') }
  }
  if ('body' in input) {
    patch.body = bodyOf(input.body)
    if (!patch.body) return { error: refuse(400, 'A mail needs something in it.') }
  }
  if ('attach' in input) {
    if (input.attach === 'none') Object.assign(patch, { attach: 'none', attachName: null })
    else {
      const doc = await getDocument(documents, userId, String(input.attach ?? ''))
      if (!doc) return { error: refuse(404, 'That document is no longer on the Resume page.') }
      Object.assign(patch, { attach: doc.id, attachName: doc.name })
    }
  }
  return { patch }
}

export async function editMailDraft({ chat, documents, mail, userId, proposalId, input = {} }) {
  const found = await findProposal(chat, userId, proposalId)
  if (!found || found.proposal.kind !== 'mail') return refuse(404, 'That mail is no longer in any chat.')
  const { proposal } = found
  if (proposal.status === 'applied') return refuse(409, 'This mail was already sent.')
  if (proposal.status !== 'pending') return refuse(409, 'This mail can no longer be changed. Ask the chat for a fresh one.')
  const { patch, error } = await patchOf({ input, documents, mailStore: mail().store, userId, proposal })
  if (error) return error
  return { status: 200, body: { proposal: await updateProposal(chat, userId, proposalId, patch) } }
}
