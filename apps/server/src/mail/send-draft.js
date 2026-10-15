import { getMailAccount, logSentMail } from '@jobdekho/store/mail-log.js'
import { toIso } from '@jobdekho/store/timestamp.js'
import { readDocument } from '../documents/read.js'
import { documentPdf } from '../documents/pdf.js'
import { downloadName } from '../api/document-files.js'
import { sendGmail } from './gmail.js'

// Sending a mail the chat drafted, the one way a mail leaves JobDekho: the
// card's countdown ran out or the person pressed Send (see the web's
// MailCard.jsx), and the chat's apply route found the draft still pending
// (see chat/apply-proposal.js), so it is sent exactly as saved, with any
// edit the person made, never as the request describes it.
//
// Resolves { mark, tracked } for the proposal and the page, or a refusal
// { status, body: { error } } that the card shows as it is. Every refusal
// before Gmail is asked means nothing was sent.
const refuse = (status, error) => ({ status, body: { error } })

const NOT_CONNECTED = 'Connect Gmail in Settings first. Nothing was sent.'
const LOST = 'JobDekho could not read the saved app password. Connect Gmail again in Settings; nothing was sent.'
const NO_DOCUMENT = 'The resume picked to attach was deleted. Pick another one; nothing was sent.'

// The attachment is compiled now, from the document as it is now, through
// the same guard and cache as its PDF on the Resume page.
async function attachmentFor({ documents, userId, attach, compile }) {
  if (!attach || attach === 'none') return { attachment: null }
  const doc = await readDocument(documents, userId, attach)
  if (!doc) return { failure: refuse(409, NO_DOCUMENT) }
  const { pdf, failure } = await documentPdf({ tex: doc.tex, store: documents, userId, compile })
  if (failure) return { failure: refuse(failure.status, `The resume to attach could not be made into a PDF. ${failure.body.error} Nothing was sent.`) }
  return { attachment: { filename: `${downloadName(doc.name)}.pdf`, content: pdf } }
}

export async function sendDraft({ mail, documents, dashboard, userId, proposal, compile, now = () => new Date() }) {
  const { store, secrets, make } = mail()
  const account = getMailAccount(store, userId)
  if (!account) return refuse(409, NOT_CONNECTED)
  const made = await attachmentFor({ documents, userId, attach: proposal.attach, compile })
  if (made.failure) return made.failure
  const password = await secrets.read(account.address, account.keptIn)
  if (!password) return refuse(409, LOST)
  const name = (await dashboard.getProfile(userId))?.basics?.name ?? ''
  let sent
  try {
    sent = await sendGmail({ address: account.address, password, from: { name }, mail: proposal, attachment: made.attachment, ...(make ? { make } : {}) })
  } catch (err) {
    if (err.name !== 'MailError') throw err
    return refuse(502, err.message)
  }
  const at = now()
  logSentMail(store, userId, { to: proposal.to, subject: proposal.subject, proposalId: proposal.id }, at)
  const tracked = await dashboard.trackMail(userId, proposal)
  return { mark: { sentAt: toIso(at), from: account.address, messageId: sent.messageId, trackerId: tracked?.id ?? null }, tracked }
}
