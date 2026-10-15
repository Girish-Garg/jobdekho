import { describe, it, expect, vi } from 'vitest'
import { openGmail, GMAIL_IMAP } from '@jobdekho/server/mail-scan/mailbox.js'

// A stand-in for imapflow's client: nothing here reaches Gmail.
function fakeClient({ connect = async () => {}, boxes = [{ path: '[Gmail]/All Mail', specialUse: '\\All' }, { path: 'INBOX', specialUse: '\\Inbox' }] } = {}) {
  const lock = { release: vi.fn() }
  const client = {
    options: null,
    connect: vi.fn(connect),
    list: vi.fn(async () => boxes),
    getMailboxLock: vi.fn(async () => lock),
    search: vi.fn(async () => [30, 10, 20]),
    fetch: vi.fn(async function* (uids, query) { for (const uid of uids) yield { uid, query } }),
    logout: vi.fn(async () => {}),
    lock,
  }
  return { client, make: (options) => { client.options = options; return client } }
}

const collect = async (iterable) => {
  const out = []
  for await (const one of iterable) out.push(one)
  return out
}

describe('opening Gmail to read', () => {
  it('signs in with the app password, opens All Mail read-only, and lets Gmail search', async () => {
    const { client, make } = fakeClient()
    const box = await openGmail({ address: 'me@example.com', password: 'abcdefghijklmnop', make })
    expect(client.options).toMatchObject({ ...GMAIL_IMAP, auth: { user: 'me@example.com', pass: 'abcdefghijklmnop' }, logger: false })
    expect(client.getMailboxLock).toHaveBeenCalledWith('[Gmail]/All Mail', { readOnly: true })
    expect(await box.search('subject:(application)')).toEqual([10, 20, 30])
    expect(client.search).toHaveBeenCalledWith({ gmraw: 'subject:(application)' }, { uid: true })
    const bodies = await collect(box.bodies([10, 20]))
    expect(bodies[0].query).toMatchObject({ uid: true, source: { start: 0, maxLength: 48 * 1024 } })
    await box.close()
    expect(client.lock.release).toHaveBeenCalled()
    expect(client.logout).toHaveBeenCalled()
  })

  it('says so when Gmail refuses the pair, or shows no All Mail', async () => {
    const refused = fakeClient({ connect: async () => { throw Object.assign(new Error('fail'), { authenticationFailed: true }) } })
    await expect(openGmail({ address: 'a@b.example', password: 'x', make: refused.make })).rejects.toThrow(/did not accept this address and app password for reading mail/)
    const hidden = fakeClient({ boxes: [{ path: 'INBOX', specialUse: '\\Inbox' }] })
    await expect(openGmail({ address: 'a@b.example', password: 'x', make: hidden.make })).rejects.toThrow(/All Mail folder/)
  })
})
