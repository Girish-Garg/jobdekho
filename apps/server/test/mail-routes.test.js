import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from '@jobdekho/server/app.js'
import { createDashboardStore } from '@jobdekho/server/api/store.js'
import { openStore } from '@jobdekho/store/open.js'
import { logSentMail } from '@jobdekho/store/mail-log.js'
import { memorySecrets, fakeTransport } from './fixtures/mail.js'

// A temporary data folder, a keeper in memory and a fake nodemailer: no test
// here reaches Gmail, a keyring or the real data folder. Made-up values only.
const ADDRESS = 'me@example.com'
const PASSWORD = 'abcd efgh ijkl mnop'
const config = { sessionSecret: 'test-secret', devUserId: 'local' }

let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-mail-routes-')) })
afterEach(() => rmSync(dir, { recursive: true, force: true }))

async function makeApp({ transport = fakeTransport(), cfg = config } = {}) {
  const store = openStore(dir)
  const secrets = memorySecrets()
  const app = buildApp({ config: cfg, dashboardStore: createDashboardStore(store) })
  app.decorate('mailStore', store)
  app.decorate('mailSecrets', secrets)
  app.decorate('mailTransport', transport.make)
  await app.ready()
  const call = (method, url, payload) => app.inject({ method, url, payload })
  return { app, store, secrets, transport, call }
}

describe('the Gmail card', () => {
  it('answers 401 without an identity', async () => {
    const { call } = await makeApp({ cfg: { sessionSecret: 'test-secret' } })
    expect((await call('GET', '/api/mail')).statusCode).toBe(401)
    expect((await call('PUT', '/api/mail', { address: ADDRESS, password: PASSWORD })).statusCode).toBe(401)
  })

  it('connects after Gmail takes the pair, keeps the password out of every file and every answer', async () => {
    const { call, secrets, transport } = await makeApp()
    expect((await call('GET', '/api/mail')).json()).toMatchObject({ connected: false, address: null, sentToday: 0 })
    const res = await call('PUT', '/api/mail', { address: ' Me@Example.com ', password: PASSWORD })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ connected: true, address: ADDRESS, keptIn: 'windows' })
    expect(res.body).not.toContain('abcd')
    expect(transport.made[0].options).toMatchObject({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: ADDRESS, pass: 'abcdefghijklmnop' } })
    expect(transport.made[0].verify).toHaveBeenCalled()
    expect(transport.made[0].sendMail).not.toHaveBeenCalled()
    expect(secrets.kept.get(ADDRESS)).toBe('abcdefghijklmnop')
    for (const name of readdirSync(dir)) expect(readFileSync(join(dir, name), 'utf8')).not.toContain('abcdefghijklmnop')
  })

  it('refuses what is not an address or not an app password before asking Gmail', async () => {
    const { call, transport } = await makeApp()
    expect((await call('PUT', '/api/mail', { address: 'nope', password: PASSWORD })).json().error).toMatch(/not an email address/)
    expect((await call('PUT', '/api/mail', { address: ADDRESS, password: 'MyGooglePassword1!' })).json().error).toMatch(/16 letters/)
    expect(transport.make).not.toHaveBeenCalled()
  })

  it('says what Gmail said when it refuses the pair, and keeps nothing', async () => {
    const refusing = fakeTransport({ verify: async () => { throw Object.assign(new Error('Invalid login'), { code: 'EAUTH', responseCode: 535, response: '535-5.7.8 Username and Password not accepted' }) } })
    const { call, secrets } = await makeApp({ transport: refusing })
    const res = await call('PUT', '/api/mail', { address: ADDRESS, password: PASSWORD })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/Gmail did not accept this address and app password/)
    expect(secrets.keep).not.toHaveBeenCalled()
    expect((await call('GET', '/api/mail')).json().connected).toBe(false)
  })

  it('disconnects, forgetting the password, and counts the mails of the last day', async () => {
    const { call, store, secrets } = await makeApp()
    await call('PUT', '/api/mail', { address: ADDRESS, password: PASSWORD })
    logSentMail(store, 'local', { to: 'a@x.example', subject: 'Hi' })
    expect((await call('GET', '/api/mail')).json().sentToday).toBe(1)
    expect((await call('DELETE', '/api/mail')).json()).toMatchObject({ connected: false, address: null })
    expect(secrets.kept.size).toBe(0)
  })
})
