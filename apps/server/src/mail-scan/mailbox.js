import { ImapFlow } from 'imapflow'
import { MailError } from '../mail/gmail.js'
import { imapSentence } from '../mail/errors.js'

// The person's Gmail, read with the same app password that sends (IMAP,
// which Gmail keeps on for every account). Only All Mail is opened, found by
// its special-use flag since its name changes with Gmail's language, and it
// is opened read-only (EXAMINE): nothing is marked read, moved or deleted.
//
// Gmail's own search picks the mails (see query.js). Headers come first for
// all of them; a body is fetched only for the ones the headers do not rule
// out, and only its first part, which holds the text a mail opens with.
//
// `make` builds the client; tests hand in a stand-in, so no test reaches
// Gmail.
export const GMAIL_IMAP = { host: 'imap.gmail.com', port: 993, secure: true }
const BODY_BYTES = 48 * 1024
// The headers that say a mail went to a list, not to one person: a
// newsletter, an alert, a course's promotion (see parse.js).
const BULK_HEADERS = ['list-unsubscribe', 'list-id', 'precedence']
const BATCH = 100

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size))

export async function openGmail({ address, password, make = (options) => new ImapFlow(options) }) {
  const client = make({
    ...GMAIL_IMAP,
    auth: { user: address, pass: password },
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: 20000,
    greetingTimeout: 15000,
    socketTimeout: 120000,
  })
  try {
    await client.connect()
  } catch (err) {
    throw new MailError(imapSentence(err), err)
  }
  const all = (await client.list()).find((box) => box.specialUse === '\\All')
  if (!all) {
    await client.logout().catch(() => {})
    throw new MailError('Gmail did not show its All Mail folder, so there is nothing to read. Check that All Mail is shown in IMAP in Gmail\'s settings.')
  }
  const lock = await client.getMailboxLock(all.path, { readOnly: true })

  async function* fetchAll(uids, query) {
    for (const batch of chunks(uids, BATCH)) {
      for await (const message of client.fetch(batch, { uid: true, ...query }, { uid: true })) yield message
    }
  }

  return {
    // The UIDs Gmail's search found, oldest first.
    async search(query) {
      return [...((await client.search({ gmraw: query }, { uid: true })) || [])].sort((a, b) => a - b)
    },
    envelopes: (uids) => fetchAll(uids, { envelope: true, threadId: true, internalDate: true, headers: BULK_HEADERS }),
    bodies: (uids) => fetchAll(uids, { source: { start: 0, maxLength: BODY_BYTES } }),
    async close() {
      lock.release()
      await client.logout().catch(() => {})
    },
  }
}
