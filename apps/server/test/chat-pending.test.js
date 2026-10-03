import { describe, it, expect, afterEach } from 'vitest'
import { createChat } from '@jobdekho/store/chats.js'
import {
  beginCall, busyCall, noteEvent, endCall, failuresOf, forgetFailure, stopCall, stopSignal,
} from '@jobdekho/server/chat/in-flight.js'
import { chatApp, heldCli, posting, until, cleanUp } from './fixtures/chat-app.js'

afterEach(cleanUp)

const ACME = posting('p1', 'Frontend Intern', 'Acme')
const VERDICT = { verdict: 'genuine', stillOpen: true, summary: 'Acme is real.', checks: [], redFlags: [] }
const answers = ({ args }) => (args.includes('WebSearch,WebFetch') ? VERDICT : { reply: 'Two are remote.' })

// Two general chats of the person's own, made in the store directly: asked
// for through the route, the second "New chat" would open the first one.
async function twoChats(store, userId) {
  const one = (await createChat(store, userId, { kind: 'general', title: 'New chat' })).chat
  const two = (await createChat(store, userId, { kind: 'general', title: 'New chat' })).chat
  return [one.id, two.id]
}

describe('the call in flight, after a reload', () => {
  it('shows the running question in the chat it was asked in, with its CLI, and nothing once it is saved', async () => {
    const held = heldCli()
    const chats = await chatApp({ cli: held.cli })
    const [a] = await twoChats(chats.store, chats.userId)
    const answered = chats.ask(a, 'which are remote?')
    await until(() => held.asked() === 1)
    const { busy } = await chats.pending()
    expect(busy).toMatchObject({ chatId: a, kind: 'question', label: 'Answering', question: 'which are remote?', provider: 'claude', web: false, title: 'New chat' })
    expect(Date.parse(busy.startedAt)).not.toBeNaN()
    held.release()
    expect((await answered).statusCode).toBe(200)
    expect(await chats.pending()).toEqual({ busy: null, waiting: {}, failed: {} })
    expect((await chats.page(a)).turns.map((t) => t.question)).toEqual(['which are remote?'])
  })

  // A job action used to be invisible to a reloaded page.
  it('shows a running job action in its job\'s own chat, which the action made', async () => {
    const held = heldCli(answers)
    const chats = await chatApp({ cli: held.cli, postings: [ACME] })
    const checked = chats.action('p1', 'fake-check')
    await until(() => held.asked() === 1)
    const { busy } = await chats.pending()
    expect(busy).toMatchObject({ kind: 'action', label: 'Is it real?', postingId: 'p1', action: 'fake-check', title: 'Frontend Intern · Acme' })
    const { chat } = (await chats.call('GET', '/api/chats/for-job/p1')).json()
    expect(chat).toMatchObject({ id: busy.chatId, kind: 'job', busy: true, placeholder: false })
    held.release()
    expect((await checked).json()).toMatchObject({ kind: 'fake-check', chatId: busy.chatId })
    expect((await chats.pending()).busy).toBeNull()
  })

  it('keeps a failure for the chat it was asked in, never another, until that chat asks again or is cleared', async () => {
    const held = heldCli(undefined, { failing: true })
    const chats = await chatApp({ cli: held.cli })
    const [a, b] = await twoChats(chats.store, chats.userId)
    const failing = chats.ask(a, 'will fail')
    await until(() => held.asked() === 1)
    held.release()
    expect((await failing).statusCode).toBeGreaterThanOrEqual(400)
    const { failed } = await chats.pending()
    expect(Object.keys(failed)).toEqual([a])
    expect(failed[a]).toMatchObject({ kind: 'question', label: 'Answering', question: 'will fail', error: expect.stringContaining('could not finish') })
    expect((await chats.pending()).failed[a]).toBeTruthy()
    expect((await chats.list()).find((c) => c.id === a)).toMatchObject({ failed: true })
    expect(failed[b]).toBeUndefined()
    await chats.call('POST', `/api/chats/${a}/clear`)
    expect((await chats.pending()).failed).toEqual({})
  })
})

describe('the follow-up a busy chat keeps waiting', () => {
  it('is kept on the server, the second replacing the first, and sent in its own chat as soon as the answer lands', async () => {
    const held = heldCli()
    const chats = await chatApp({ cli: held.cli })
    const [a] = await twoChats(chats.store, chats.userId)
    const first = chats.ask(a, 'which are remote?')
    await until(() => held.asked() === 1)
    expect((await chats.call('POST', `/api/chats/${a}/queue`, { message: 'and the pay?' })).json()).toEqual({ waiting: { message: 'and the pay?', at: expect.any(String) } })
    const queued = await chats.call('POST', `/api/chats/${a}/queue`, { message: 'and the location?' })
    expect(queued.statusCode).toBe(200)
    expect((await chats.pending()).waiting).toEqual({ [a]: { message: 'and the location?', at: expect.any(String) } })
    expect((await chats.list()).find((c) => c.id === a)).toMatchObject({ busy: true, waiting: true })
    held.release()
    await first
    await until(() => held.asked() === 2)
    expect((await chats.pending())).toMatchObject({ busy: { chatId: a, question: 'and the location?' }, waiting: {} })
    held.release()
    await until(async () => (await chats.page(a)).turns.length === 2)
    expect((await chats.page(a)).turns.map((t) => t.question)).toEqual(['which are remote?', 'and the location?'])
    await until(async () => (await chats.pending()).busy === null)
  })

  it('belongs to the busy chat alone, and goes when cleared with an empty message', async () => {
    const held = heldCli()
    const chats = await chatApp({ cli: held.cli })
    const [a, b] = await twoChats(chats.store, chats.userId)
    const first = chats.ask(a, 'which are remote?')
    await until(() => held.asked() === 1)
    const elsewhere = await chats.call('POST', `/api/chats/${b}/queue`, { message: 'about b' })
    expect(elsewhere.statusCode).toBe(409)
    expect(elsewhere.json().busy).toMatchObject({ chatId: a, label: 'Answering' })
    await chats.call('POST', `/api/chats/${a}/queue`, { message: 'and the pay?' })
    expect((await chats.call('POST', `/api/chats/${a}/queue`, { message: '  ' })).json()).toEqual({ waiting: null })
    expect((await chats.pending()).waiting).toEqual({})
    held.release()
    await first
    expect(held.asked()).toBe(1)
    expect((await chats.page(a)).turns).toHaveLength(1)
  })

  it('waits on a job action in the job\'s chat too, and is asked there when the action lands', async () => {
    const held = heldCli(answers)
    const chats = await chatApp({ cli: held.cli, postings: [ACME] })
    const checked = chats.action('p1', 'fake-check')
    await until(() => held.asked() === 1)
    const queued = (await chats.call('POST', '/api/chats/job:p1/queue', { message: 'why genuine?' })).json()
    expect(queued).toEqual({ waiting: { message: 'why genuine?', at: expect.any(String) } })
    held.release()
    const { chatId } = (await checked).json()
    await until(() => held.asked() === 2)
    expect((await chats.pending()).busy).toMatchObject({ chatId, kind: 'question', question: 'why genuine?' })
    held.release()
    await until(async () => (await chats.page(chatId)).turns.length === 1)
    expect((await chats.page(chatId)).results).toHaveLength(1)
  })

  it('is asked at once when nothing is running', async () => {
    const held = heldCli()
    const chats = await chatApp({ cli: held.cli })
    const [a] = await twoChats(chats.store, chats.userId)
    const res = await chats.call('POST', `/api/chats/${a}/queue`, { message: 'which are remote?' })
    expect(res.statusCode).toBe(202)
    expect(res.json()).toEqual({ started: true, chatId: a })
    await until(() => held.asked() === 1)
    expect((await chats.pending()).busy).toMatchObject({ chatId: a, question: 'which are remote?' })
    held.release()
    await until(async () => (await chats.page(a)).turns.length === 1)
  })

  it('answers 404 for a chat that is not there', async () => {
    const chats = await chatApp()
    expect((await chats.call('POST', '/api/chats/nope/queue', { message: 'q' })).statusCode).toBe(404)
  })
})

describe('in-flight.js', () => {
  it('holds one call per person, whatever its kind, and follows the stream and a combined action\'s label', () => {
    expect(beginCall('unit-a', { chatId: 'c1', kind: 'combined', label: 'Cover letter 1 of 2' }, 0)).toBe(true)
    expect(beginCall('unit-a', { chatId: 'c2', kind: 'question', label: 'Answering' }, 0)).toBe(false)
    noteEvent('unit-a', { event: 'start', provider: 'agy' })
    noteEvent('unit-a', { event: 'progress', stage: 'letter', label: 'Cover letter 2 of 2' })
    expect(busyCall('unit-a')).toEqual({
      chatId: 'c1', kind: 'combined', label: 'Cover letter 2 of 2', startedAt: new Date(0).toISOString(), provider: 'agy', stage: 'letter', web: false, text: '',
    })
    expect(endCall('unit-a')).toMatchObject({ chatId: 'c1' })
    expect(busyCall('unit-a')).toBeNull()
    expect(failuresOf('unit-a')).toEqual({})
  })

  it('keeps a failure by chat until that chat starts again or forgets it, and stops only in the running chat', () => {
    beginCall('unit-b', { chatId: 'c1', kind: 'action', label: 'Is it real?', postingId: 'p1', action: 'fake-check' }, 0)
    expect(stopCall('unit-b', 'c2')).toBe(false)
    expect(stopCall('unit-b', 'c1')).toBe(true)
    expect(stopSignal('unit-b').aborted).toBe(true)
    endCall('unit-b', 'It broke.', 1000)
    expect(failuresOf('unit-b')).toEqual({ c1: { kind: 'action', label: 'Is it real?', question: null, error: 'It broke.', at: new Date(1000).toISOString(), postingId: 'p1', action: 'fake-check' } })
    beginCall('unit-b', { chatId: 'c2', kind: 'question', label: 'Answering' })
    expect(Object.keys(failuresOf('unit-b'))).toEqual(['c1'])
    endCall('unit-b')
    beginCall('unit-b', { chatId: 'c1', kind: 'question', label: 'Answering' })
    expect(failuresOf('unit-b')).toEqual({})
    endCall('unit-b', 'Again.')
    forgetFailure('unit-b', 'c1')
    expect(failuresOf('unit-b')).toEqual({})
  })
})
