import { cleanEmail } from '@jobdekho/store/tracker-entry.js'
import { getMailAccount, saveMailAccount, clearMailAccount, sentInLastDay } from '@jobdekho/store/mail-log.js'
import { checkGmail } from './gmail.js'

// Connecting Gmail from Settings, and what the card shows of it. The app
// password is checked against Gmail before it is kept, so a typo is found
// while the person is still looking at the field, and it is never sent back:
// the view says which address is connected and where its password is kept.
//
// There is no cap of JobDekho's own on how many go out: every mail is one
// the person saw in the chat, and Gmail's own daily limit, when reached,
// comes back as Gmail's own sentence (see errors.js).

// Google shows an app password as four groups of four letters; spaces and
// line breaks copied with it are not part of it.
const APP_PASSWORD = /^[A-Za-z]{16}$/

export const NOT_ADDRESS = 'That is not an email address. Type the Gmail address the app password belongs to.'
export const NOT_APP_PASSWORD = 'An app password is 16 letters. Copy it from the page Google showed it on; your usual Google password will not work here.'

export function mailView(store, userId, now = new Date()) {
  const account = getMailAccount(store, userId)
  return {
    connected: Boolean(account),
    address: account?.address ?? null,
    keptIn: account?.keptIn ?? null,
    savedAt: account?.savedAt ?? null,
    sentToday: sentInLastDay(store, userId, now),
  }
}

// Resolves { view } or { error } with the sentence to show under the fields.
export async function connectMail({ store, userId, input, secrets, make }) {
  const address = cleanEmail(input?.address)
  if (!address) return { error: NOT_ADDRESS }
  const password = String(input?.password ?? '').replace(/\s+/g, '')
  if (!APP_PASSWORD.test(password)) return { error: NOT_APP_PASSWORD }
  try {
    await checkGmail({ address, password, ...(make ? { make } : {}) })
  } catch (err) {
    if (err.name === 'MailError') return { error: err.message }
    throw err
  }
  const before = getMailAccount(store, userId)
  if (before) await secrets.forget(before.address, before.keptIn)
  try {
    const keptIn = await secrets.keep(address, password)
    saveMailAccount(store, userId, { address, keptIn })
  } catch (err) {
    clearMailAccount(store, userId)
    return { error: err.message }
  }
  return { view: mailView(store, userId) }
}

// Forgets the address and the password; the app password itself stays valid
// at Google until the person revokes it there, which the card says.
export async function disconnectMail({ store, userId, secrets }) {
  const account = getMailAccount(store, userId)
  if (account) await secrets.forget(account.address, account.keptIn)
  clearMailAccount(store, userId)
  return mailView(store, userId)
}
