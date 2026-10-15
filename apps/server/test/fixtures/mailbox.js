// A stand-in for the person's Gmail (see mail-scan/mailbox.js): made-up
// mails only, built as real RFC 822 sources so the parser reads them as it
// would Gmail's. `search` answers every query with every mail and keeps the
// queries it was asked, for a test to read.
let next = 0

export function rawMail({ from, to = 'me@example.com', subject, date, id, inReplyTo = null, text = '', html = null }) {
  const head = [
    `From: ${from}`, `To: ${to}`, `Subject: ${subject}`, `Date: ${new Date(date).toUTCString()}`, `Message-ID: <${id}>`,
    ...(inReplyTo ? [`In-Reply-To: <${inReplyTo}>`] : []), 'MIME-Version: 1.0',
  ]
  const type = html ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8'
  return `${head.join('\r\n')}\r\nContent-Type: ${type}\r\n\r\n${html ?? text}\r\n`
}

const parseAddress = (value) => {
  const match = /^(?:"?([^"<]*)"?\s*)?<([^>]+)>$/.exec(value.trim())
  return match ? { name: (match[1] ?? '').trim(), address: match[2] } : { name: '', address: value.trim() }
}

//   mail: { from: 'Name <a@b>', to?, subject, date, id, thread?, inReplyTo?, text?, html? }
export function message(mail) {
  next += 1
  return {
    uid: mail.uid ?? next,
    threadId: mail.thread ?? `t-${mail.id}`,
    envelope: {
      messageId: `<${mail.id}>`,
      inReplyTo: mail.inReplyTo ? `<${mail.inReplyTo}>` : undefined,
      date: new Date(mail.date),
      subject: mail.subject,
      from: [parseAddress(mail.from)],
      to: [parseAddress(mail.to ?? 'me@example.com')],
    },
    source: Buffer.from(rawMail(mail)),
  }
}

export function fakeMailbox(mails) {
  const messages = mails.map(message)
  const queries = []
  const opened = []
  const pick = (uids) => messages.filter((one) => uids.includes(one.uid))
  async function* each(uids, shape) {
    for (const one of pick(uids)) yield shape(one)
  }
  const open = async (login) => {
    opened.push(login)
    return {
      search: async (query) => {
        queries.push(query)
        return messages.map((one) => one.uid)
      },
      envelopes: (uids) => each(uids, ({ uid, threadId, envelope }) => ({ uid, threadId, envelope })),
      bodies: (uids) => each(uids, ({ uid, source }) => ({ uid, source })),
      close: async () => {},
    }
  }
  return { open, queries, opened, messages }
}
