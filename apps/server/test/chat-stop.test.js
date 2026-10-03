import { describe, it, expect, vi, afterEach } from 'vitest'
import { createChat } from '@jobdekho/store/chats.js'
import { readNdjson } from '@jobdekho/server/ai/events.js'
import { chatApp, posting, until, cleanUp } from './fixtures/chat-app.js'

afterEach(cleanUp)

const delta = (text) => JSON.stringify({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text } } })

// A CLI that writes the start of an answer, then waits to be stopped, the
// way a real one is ended from spawn.js.
function writingCli() {
  let started = 0
  const run = vi.fn(({ args, signal, onStdout }) => {
    if (args[0] === '--version') return Promise.resolve({ stdout: '2.1.0', stderr: '', code: 0 })
    started += 1
    onStdout?.(`${delta('{"reply":"Both are')}\n`)
    return new Promise((resolve, reject) => {
      signal?.addEventListener('abort', () => reject(Object.assign(new Error('stopped'), { code: 'EABORTED' })))
    })
  })
  return { cli: { locate: () => '/usr/local/bin/claude', run, scratch: (work) => work('/scratch') }, started: () => started }
}

async function setup() {
  const writing = writingCli()
  const chats = await chatApp({ cli: writing.cli, postings: [posting('p1', 'Frontend Intern', 'Acme')] })
  const chat = (await createChat(chats.store, chats.userId, { kind: 'general', title: 'New chat' })).chat
  const other = (await createChat(chats.store, chats.userId, { kind: 'general', title: 'New chat' })).chat
  const stop = async (id = chat.id) => (await chats.call('POST', `/api/chats/${id}/stop`)).json()
  return { ...chats, ...writing, chat, other, stop }
}

describe('stopping the running answer', () => {
  it('ends the CLI, saves nothing, and reports no failure', async () => {
    const app = await setup()
    const answered = app.ask(app.chat.id, 'compare the top two')
    await until(() => app.started() === 1)
    expect((await app.pending()).busy.text).toBe('Both are')
    expect(await app.stop()).toEqual({ stopped: true })
    const res = await answered
    expect(res.statusCode).toBe(499)
    expect(res.json()).toMatchObject({ kind: 'stopped' })
    expect(await app.pending()).toEqual({ busy: null, waiting: {}, failed: {} })
    expect((await app.page(app.chat.id)).turns).toEqual([])
  })

  // The running answer is always in one known chat.
  it('stops nothing from another chat', async () => {
    const app = await setup()
    const answered = app.ask(app.chat.id, 'compare the top two')
    await until(() => app.started() === 1)
    expect(await app.stop(app.other.id)).toEqual({ stopped: false })
    expect(await app.stop('nope')).toEqual({ stopped: false })
    expect(await app.stop()).toEqual({ stopped: true })
    await answered
  })

  it('stops a job action too, in its job\'s chat', async () => {
    const app = await setup()
    const checked = app.action('p1', 'fake-check')
    await until(() => app.started() === 1)
    const { busy } = await app.pending()
    expect(await app.stop('job:p1')).toEqual({ stopped: true })
    expect((await checked).json()).toMatchObject({ kind: 'stopped' })
    expect(busy.kind).toBe('action')
    expect((await app.pending()).failed).toEqual({})
  })

  it('streams the answer as it is written, then ends the stream with the stop', async () => {
    const app = await setup()
    const answered = app.call('POST', `/api/chats/${app.chat.id}/messages`, { message: 'compare the top two' }, { accept: 'application/x-ndjson' })
    await until(() => app.started() === 1)
    await new Promise((resolve) => setTimeout(resolve, 150))
    await app.stop()
    const { events, result } = readNdjson((await answered).body)
    expect(events.filter((e) => e.event === 'text')).toEqual([{ event: 'text', add: 'Both are' }])
    expect(result).toMatchObject({ kind: 'stopped' })
  })

  it('says so when there is nothing to stop', async () => {
    const app = await setup()
    expect(await app.stop()).toEqual({ stopped: false })
  })
})
