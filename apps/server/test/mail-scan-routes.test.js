import { describe, it, expect, afterEach } from 'vitest'
import { saveMailAccount } from '@jobdekho/store/mail-log.js'
import { addTrackerEntry } from '@jobdekho/store/tracker.js'
import { getScanState } from '@jobdekho/store/mail-scan-state.js'
import { chatApp, cleanUp, until } from './fixtures/chat-app.js'
import { memorySecrets } from './fixtures/mail.js'
import { fakeMailbox } from './fixtures/mailbox.js'
import { JOB_MAILS, ME } from './fixtures/job-mails.js'
import { mailWatchFor } from '@jobdekho/server/mail-scan/watch.js'
import { mailDeps } from '@jobdekho/server/mail/deps.js'

afterEach(cleanUp)

// A fake Gmail of made-up mail behind the real routes, store and Tracker.
async function setup({ connected = true, seed = null } = {}) {
  const secrets = memorySecrets()
  const box = fakeMailbox(JOB_MAILS)
  const app = await chatApp({
    seed: async (store, userId) => {
      if (connected) {
        saveMailAccount(store, userId, { address: ME, keptIn: 'windows' })
        secrets.kept.set(ME, 'abcdefghijklmnop')
      }
      await seed?.(store, userId)
    },
    decorate: (instance, store) => {
      instance.decorate('mailStore', store)
      instance.decorate('mailSecrets', secrets)
      instance.decorate('mailOpen', box.open)
    },
  })
  const status = async () => (await app.call('GET', '/api/mail/scan')).json()
  const scan = async (body = {}) => {
    const res = await app.call('POST', '/api/mail/scan', body)
    await until(async () => !(await status()).running)
    return res
  }
  const tracker = async () => (await app.call('GET', '/api/tracker')).json().entries
  return { ...app, box, status, scan, tracker }
}

const summary = (entries) => entries.map((e) => [e.company, e.stage, e.events.length]).sort((a, b) => a[0].localeCompare(b[0]))

describe('scanning the mail into the Tracker', () => {
  it('files every application the mail shows, with where each line came from, read-only', async () => {
    const app = await setup()
    expect((await app.scan()).statusCode).toBe(200)
    expect(app.box.opened[0]).toEqual({ address: ME, password: 'abcdefghijklmnop' })
    expect(app.box.queries[0]).not.toContain('after:')
    expect(summary(await app.tracker())).toEqual([
      ['Acmelabs', 'replied', 2], ['Globex', 'interview', 2], ['Initech', 'closed', 3], ['Stark Labs', 'offer', 1], ['Umbrella Health', 'applied', 1],
    ])
    const initech = (await app.tracker()).find((e) => e.company === 'Initech')
    expect(initech.events.map((e) => e.from)).toEqual(['Lever mail', 'HackerRank mail', 'Lever mail'])
    expect(initech.events.every((e) => e.mailId)).toBe(true)
    expect((await app.tracker()).find((e) => e.company === 'Acmelabs').contact).toEqual({ name: 'Priya', email: 'priya@acmelabs.example' })
    expect(await app.status()).toMatchObject({ running: false, canUndo: true, last: { ok: true, added: 5, updated: 0, found: 5, unsure: 1 } })
  })

  it('catches up from two days before the last scan, and adds nothing twice', async () => {
    const app = await setup()
    await app.scan()
    const before = summary(await app.tracker())
    await app.scan()
    expect(app.box.queries[1]).toMatch(/after:\d{4}\/\d{1,2}\/\d{1,2}$/)
    const lastAt = getScanState(app.store, app.userId).lastAt
    expect(Date.parse(lastAt)).toBeGreaterThan(Date.now() - 60000)
    expect(summary(await app.tracker())).toEqual(before)
    expect((await app.status()).last).toMatchObject({ added: 0, updated: 0 })
  })

  it('adds to an application already tracked instead of making a second one', async () => {
    const app = await setup({ seed: (store, userId) => addTrackerEntry(store, userId, { company: 'Globex', role: '', stage: 'applied' }, new Date('2026-09-01T00:00:00Z')) })
    await app.scan()
    const globex = (await app.tracker()).filter((e) => e.company === 'Globex')
    expect(globex).toHaveLength(1)
    expect(globex[0]).toMatchObject({ stage: 'interview', role: 'Frontend Developer' })
    expect((await app.status()).last).toMatchObject({ added: 4, updated: 1 })
  })

  it('undoes the last scan whole, and the mails it read do not come back', async () => {
    const app = await setup()
    await app.scan()
    const undone = (await app.call('POST', '/api/mail/scan/undo')).json()
    expect(undone).toMatchObject({ undone: true, removed: 5, status: { canUndo: false } })
    expect(await app.tracker()).toEqual([])
    await app.scan()
    expect(await app.tracker()).toEqual([])
  })

  it('scans nothing without Gmail connected, and checks on its own only after a first scan', async () => {
    const off = await setup({ connected: false })
    expect((await off.call('POST', '/api/mail/scan')).statusCode).toBe(409)
    const app = await setup()
    // The watch start.js starts, the same one the routes use.
    const watch = mailWatchFor({ deps: mailDeps(app.app), dashboard: app.app.dashboard, userId: app.userId })
    expect(await watch.check()).toBe(false)
    await app.scan()
    expect(await watch.check()).toBe(true)
  })
})
