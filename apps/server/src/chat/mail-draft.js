import { randomUUID } from 'node:crypto'
import { cleanEmail, emailsIn, line } from '@jobdekho/store/tracker-entry.js'

// The mail a chat reply offers (see prompt-mail.js), as a proposal the card
// shows and the person sends (see mail/send-draft.js):
//
//   { id, kind: 'mail', summary, status, to, name, company, role, subject,
//     body, postingId, attach, mailedBefore }
//
// The address must be one the person typed in this chat. JobDekho never
// guesses, builds or looks one up, and a model asked to mail "the founder of
// Acme" could make one up that reaches a stranger; such a draft is kept as
// 'refused' with the reason, so the card says why there is nothing to send.
//
// `attach` is null until the person picks a resume or none (see the web's
// mailAttach.js); false from the model, when they said not to attach one,
// is 'none' at once. In a job's chat the job fills in the company and role
// the model left out, and is what the Tracker files the mail under.
const MAX_SUBJECT = 200
const MAX_BODY = 6000

export const NOT_TYPED = 'JobDekho only mails an address you typed in this chat, and this one was not, so there is nothing to send. Type the address you want to mail.'

// Plain text with its paragraphs: line breaks kept, runs of blank lines and
// trailing spaces dropped, nothing that could pass for a header.
export function bodyOf(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/\r\n?/g, '\n').split('\n').map((row) => row.replace(/[ \t]+$/, '')).join('\n')
    .replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_BODY)
}

const typedBy = (said, address) => said.some((text) => emailsIn(text).includes(address))

export function validateMailDraft(raw, context) {
  if (!raw || typeof raw !== 'object' || !context?.mail) return null
  const to = cleanEmail(raw.to)
  const subject = line(raw.subject, MAX_SUBJECT)
  const body = bodyOf(raw.body)
  if (!to || !subject || !body) return null
  const job = context.chatKind === 'job' ? context.chatJobs?.find((one) => one.title) ?? null : null
  const name = line(raw.name)
  const draft = {
    id: randomUUID(),
    kind: 'mail',
    summary: `Mail to ${name || to}`,
    status: 'pending',
    to,
    name,
    company: line(raw.company) || job?.company || '',
    role: line(raw.role) || job?.title || '',
    subject,
    body,
    postingId: job?.id ?? null,
    attach: raw.attach === false ? 'none' : null,
    mailedBefore: context.mail.mailed?.[to] ?? null,
  }
  return typedBy(context.mail.said ?? [], to) ? draft : { ...draft, status: 'refused', reason: NOT_TYPED }
}
