import nodemailer from 'nodemailer'
import { mailSentence } from './errors.js'

// Gmail over SMTP with an app password: the one way a program on the
// person's own computer can send from their Gmail without JobDekho being
// registered with Google, whose permissions to send and read mail need its
// review. The mail goes from their account like one they wrote, and Gmail
// files it in their Sent folder itself.
//
// `make` is nodemailer's createTransport, a seam tests replace so nothing
// here ever reaches Gmail. Timeouts are short: a check the person waits on
// in Settings, or one mail, never a batch.
export const GMAIL_SMTP = { host: 'smtp.gmail.com', port: 465, secure: true }
const TIMEOUTS = { connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000 }

export class MailError extends Error {
  constructor(sentence, cause) {
    super(sentence)
    this.name = 'MailError'
    this.cause = cause
  }
}

function transport({ address, password, make }) {
  return make({ ...GMAIL_SMTP, ...TIMEOUTS, auth: { user: address, pass: password } })
}

// Signs in and out again, sending nothing: what Connect in Settings does,
// so a wrong pair is found while the person is still looking at it.
export async function checkGmail({ address, password, make = nodemailer.createTransport }) {
  const mailer = transport({ address, password, make })
  try {
    await mailer.verify()
  } catch (err) {
    throw new MailError(mailSentence(err), err)
  } finally {
    mailer.close?.()
  }
}

//   mail: { to, subject, body }, from: { name, address },
//   attachment: { filename, content } | null
// Resolves { messageId }, kept so a reply can be matched to it later.
export async function sendGmail({ address, password, from, mail, attachment = null, make = nodemailer.createTransport }) {
  const mailer = transport({ address, password, make })
  try {
    const info = await mailer.sendMail({
      from: { name: from.name || '', address },
      to: mail.to,
      subject: mail.subject,
      text: mail.body,
      ...(attachment ? { attachments: [{ filename: attachment.filename, content: attachment.content, contentType: 'application/pdf' }] } : {}),
    })
    return { messageId: info?.messageId ?? null }
  } catch (err) {
    throw new MailError(mailSentence(err, mail.to), err)
  } finally {
    mailer.close?.()
  }
}
