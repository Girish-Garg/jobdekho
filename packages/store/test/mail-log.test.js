import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore, FILES } from '@jobdekho/store/open.js'
import { getMailAccount, saveMailAccount, clearMailAccount, logSentMail, sentInLastDay, lastMailed } from '@jobdekho/store/mail-log.js'

let dir
let store
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'jobdekho-mail-log-'))
  store = openStore(dir)
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('the connected account', () => {
  it('keeps the address and where the password is kept, never the password', () => {
    expect(getMailAccount(store, 'u1')).toBeNull()
    saveMailAccount(store, 'u1', { address: 'Me@Gmail.com', keptIn: 'windows' }, new Date('2026-10-15T00:00:00.000Z'))
    expect(getMailAccount(store, 'u1')).toEqual({ address: 'me@gmail.com', keptIn: 'windows', savedAt: '2026-10-15T00:00:00.000Z' })
    expect(Object.keys(JSON.parse(readFileSync(join(dir, FILES.mailAccount), 'utf8')).u1)).toEqual(['address', 'keptIn', 'savedAt'])
    clearMailAccount(store, 'u1')
    expect(getMailAccount(store, 'u1')).toBeNull()
  })
})

describe('the mails sent', () => {
  it('counts a rolling day, and says when each address was last mailed', () => {
    const at = (iso) => new Date(iso)
    logSentMail(store, 'u1', { to: 'a@x.example', subject: 'One' }, at('2026-10-13T10:00:00.000Z'))
    logSentMail(store, 'u1', { to: 'b@x.example', subject: 'Two' }, at('2026-10-14T08:00:00.000Z'))
    logSentMail(store, 'u1', { to: 'A@x.example', subject: 'Three' }, at('2026-10-14T09:00:00.000Z'))
    expect(sentInLastDay(store, 'u1', at('2026-10-14T12:00:00.000Z'))).toBe(2)
    expect(sentInLastDay(store, 'u1', at('2026-10-15T08:30:00.000Z'))).toBe(1)
    expect(lastMailed(store, 'u1')).toEqual(new Map([['a@x.example', '2026-10-14T09:00:00.000Z'], ['b@x.example', '2026-10-14T08:00:00.000Z']]))
  })
})
