import PostalMime from 'postal-mime'
import { toIso } from '@jobdekho/store/timestamp.js'

// One mail as the scan reads it: who sent it, to whom, when, its subject,
// the thread Gmail keeps it in, and the text it opens with. Nothing else is
// read, and of all this only the id, date, sender label and what it said
// (kind, company, role) is ever kept (see the store's tracker-scan.js).
const MAX_TEXT = 4000

const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" }

// A mail sent only as HTML read as text: scripts and styles gone, blocks on
// lines of their own, tags dropped, the common entities spelled out.
export function htmlText(html) {
  return String(html ?? '')
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(nbsp|amp|lt|gt|quot|#39|apos);/g, (entity) => ENTITIES[entity])
}

const tidy = (text) => text.replace(/\r/g, '').replace(/[ \t ]+/g, ' ').replace(/\n[ \t]*/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_TEXT)

const address = (value) => String(value ?? '').trim().toLowerCase()

// From imapflow's fetch of the headers (envelope, Gmail's thread id). `me`
// is the connected address, so a mail the person sent is known as theirs.
export function mailFromEnvelope(message, me) {
  const envelope = message.envelope ?? {}
  const from = envelope.from?.[0] ?? {}
  return {
    uid: message.uid,
    threadId: message.threadId ? String(message.threadId) : null,
    id: envelope.messageId || `uid:${message.uid}`,
    inReplyTo: envelope.inReplyTo || null,
    date: toIso(envelope.date || message.internalDate),
    from: { name: String(from.name ?? '').trim(), address: address(from.address) },
    to: (envelope.to ?? []).map((one) => address(one.address)).filter(Boolean),
    subject: String(envelope.subject ?? '').replace(/\s+/g, ' ').trim(),
    mine: address(from.address) === address(me),
    text: '',
  }
}

// The same mail with the text of its body, from the first bytes of its
// source; a body that cannot be read leaves the mail as its headers.
export async function withBody(mail, source) {
  if (!source) return mail
  try {
    const email = await PostalMime.parse(source)
    const text = email.text?.trim() ? email.text : htmlText(email.html)
    return { ...mail, text: tidy(text) }
  } catch {
    return mail
  }
}
