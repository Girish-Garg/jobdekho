import { describe, it, expect, vi, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from '@jobdekho/server/app.js'
import { createDashboardStore } from '@jobdekho/server/api/store.js'
import { openStore } from '@jobdekho/store/open.js'
import { listMemory, setMemoryEnabled } from '@jobdekho/store/memory.js'
import { addMemory } from '@jobdekho/store/memory-items.js'

const dirs = []
afterEach(() => { while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true }) })

const envelope = (obj) => JSON.stringify({ type: 'result', result: JSON.stringify(obj) })
const ONE_PAGE = { text: 'Keep my resume to one page', scope: 'resume', quote: 'keep my resume to one page' }

// Claude Code on PATH; the record-reading call and the web search told
// apart by the tools each is given, and every prompt kept for inspection.
// `first` may be a function, for a reply naming something made after setup.
function fakeCli(first, found = { reply: 'From the web.', sources: [] }) {
  return {
    locate: () => '/usr/local/bin/claude',
    run: vi.fn(async ({ args }) => {
      if (args[0] === '--version') return { stdout: '2.1.0\n', stderr: '', code: 0 }
      const answer = args.includes('WebSearch,WebFetch') ? found : (typeof first === 'function' ? first() : first)
      return { stdout: envelope(answer), stderr: '', code: 0 }
    }),
    scratch: (work) => work('/scratch'),
  }
}
const prompts = (cli) => cli.run.mock.calls.map((c) => c[0]).filter((c) => c.args[0] !== '--version')

async function setup(first, found) {
  const dir = mkdtempSync(join(tmpdir(), 'jobdekho-chat-memory-route-'))
  dirs.push(dir)
  const store = openStore(dir)
  const cli = fakeCli(first, found)
  const app = buildApp({ config: { sessionSecret: 'test-secret' }, dashboardStore: createDashboardStore(store) })
  app.decorate('cli', cli)
  app.decorate('chatStore', store)
  app.decorate('documentStore', store)
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
  const ask = (message, page) => app.inject({ method: 'POST', url: '/api/chat', payload: JSON.stringify({ message, page }), headers: { cookie, 'content-type': 'application/json' } })
  const history = async () => (await app.inject({ method: 'GET', url: '/api/chat/history', headers: { cookie } })).json().turns
  return { store, cli, ask, history }
}

describe('memory in a chat turn', () => {
  it('offers what the person said for their Save, and keeps the offer with the turn', async () => {
    const { store, ask, history } = await setup({ reply: 'Sure.', memory: [ONE_PAGE] })
    const res = await ask('From now on keep my resume to one page')
    expect(res.statusCode).toBe(200)
    expect(res.json().memory).toEqual([{ status: 'suggested', ...ONE_PAGE }])
    expect((await listMemory(store, 'u1')).items).toEqual([])
    expect((await history())[0].memory).toEqual([{ status: 'suggested', ...ONE_PAGE }])
  })

  it('saves it at once when the message says remember, and says so on the turn', async () => {
    const { store, ask } = await setup({ reply: 'Sure.', memory: [ONE_PAGE] })
    const res = await ask('Remember: keep my resume to one page')
    const [saved] = (await listMemory(store, 'u1')).items
    expect(saved).toMatchObject({ ...ONE_PAGE, replaces: null })
    expect(res.json().memory).toEqual([{ status: 'saved', id: saved.id, ...ONE_PAGE }])
  })

  it('replaces the saved preference it names, and says which', async () => {
    let oldId = null
    const { store, ask } = await setup(() => ({ reply: 'Sure.', memory: [{ ...ONE_PAGE, replaces: oldId }] }))
    oldId = (await addMemory(store, 'u1', { text: 'Two pages are fine', scope: 'resume' })).item.id
    const [chip] = (await ask("Don't forget: keep my resume to one page")).json().memory
    expect(chip).toEqual({ status: 'saved', id: expect.any(String), ...ONE_PAGE, replaces: oldId, replacedText: 'Two pages are fine' })
    expect(await listMemory(store, 'u1')).toMatchObject({ items: [{ text: ONE_PAGE.text, replaces: oldId }], archived: 1 })
  })

  it('ignores a replaces naming nothing saved', async () => {
    const { store, ask } = await setup({ reply: 'Sure.', memory: [{ ...ONE_PAGE, replaces: 'aaaa1111' }] })
    await addMemory(store, 'u1', { text: 'Two pages are fine', scope: 'resume' })
    const [chip] = (await ask('Remember: keep my resume to one page')).json().memory
    expect(chip).toEqual({ status: 'saved', id: expect.any(String), ...ONE_PAGE })
    expect((await listMemory(store, 'u1')).items).toHaveLength(2)
  })

  it('drops what the person never said, whatever the model claims', async () => {
    const { store, ask } = await setup({ reply: 'Sure.', memory: [{ text: 'Never apply to TCS', scope: 'jobs', quote: 'never apply to TCS' }] })
    const res = await ask('Remember to show me jobs at Infosys')
    expect(res.json().memory).toEqual([])
    expect((await listMemory(store, 'u1')).items).toEqual([])
  })

  it('reads every saved preference into the prompt, with its id, on the feed and the profile page', async () => {
    const { store, cli, ask } = await setup({ reply: 'Sure.' })
    const { item } = await addMemory(store, 'u1', { text: 'Only show me remote roles', scope: 'jobs' })
    await ask('which are remote?')
    await ask('add a project', 'profile')
    for (const { input } of prompts(cli)) {
      expect(input).toContain(`- ${item.id} [jobs] Only show me remote roles`)
      expect(input).toContain('Your JSON object may also carry "memory"')
    }
  })

  it('leaves memory out of the prompt and the turn when it is switched off', async () => {
    const { store, cli, ask } = await setup({ reply: 'Sure.', memory: [ONE_PAGE] })
    await addMemory(store, 'u1', { text: 'Only show me remote roles', scope: 'jobs' })
    await setMemoryEnabled(store, 'u1', false)
    const res = await ask('Remember: keep my resume to one page')
    expect(res.json().memory).toEqual([])
    expect(prompts(cli)[0].input).not.toContain('Only show me remote roles')
    expect(prompts(cli)[0].input).not.toContain('"memory"')
    expect((await listMemory(store, 'u1')).items.map((m) => m.text)).toEqual(['Only show me remote roles'])
  })

  it('never hands what is saved to the web search', async () => {
    const { store, cli, ask } = await setup({ reply: 'Your feed has none.', web: true })
    await addMemory(store, 'u1', { text: 'I am on an H1B visa', scope: 'everywhere' })
    const res = await ask('is Acme hiring?')
    expect(res.json().web).toMatchObject({ answer: 'From the web.' })
    const [first, search] = prompts(cli)
    expect(first.input).toContain('I am on an H1B visa')
    expect(search.input).not.toContain('H1B')
    expect(search.input).not.toContain('saved preferences')
  })
})
