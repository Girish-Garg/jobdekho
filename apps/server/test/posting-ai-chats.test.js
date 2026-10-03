import { describe, it, expect, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createChat } from '@jobdekho/store/chats.js'
import { FILES } from '@jobdekho/store/open.js'
import { chatApp, heldCli, answeringCli, posting, until, cleanUp } from './fixtures/chat-app.js'

afterEach(cleanUp)

const VERDICT = (summary) => ({ verdict: 'genuine', stillOpen: true, summary, checks: [], redFlags: [] })
const answers = ({ input }) => VERDICT(input.includes('check the recruiter') ? 'Recruiter checked.' : 'Acme is real.')

async function setup(cli = answeringCli(answers)) {
  const made = {}
  const chats = await chatApp({
    cli: cli.cli, postings: [posting('p1', 'Frontend Intern', 'Acme'), posting('p2', 'Writer', 'Writesonic')],
    seed: async (store, userId) => {
      made.compare = (await createChat(store, userId, { kind: 'compare', jobs: ['p1', 'p2'], title: 'Acme vs Writesonic' })).chat
      made.general = (await createChat(store, userId, { kind: 'general', title: 'New chat' })).chat
    },
  })
  return { ...chats, ...cli, ...made, jobPage: async (id = 'p1') => (await chats.call('GET', `/api/chats/for-job/${id}`)).json() }
}

describe('a job action and the chats', () => {
  it('makes the job\'s own chat on its first action, and records that chat on the version', async () => {
    const app = await setup()
    expect((await app.jobPage()).chat).toMatchObject({ id: 'job:p1', placeholder: true, title: 'Frontend Intern · Acme' })
    const record = (await app.action('p1', 'fake-check')).json()
    const { chat, turns, results } = await app.jobPage()
    expect(chat).toMatchObject({ id: record.chatId, kind: 'job', jobs: [{ id: 'p1', title: 'Frontend Intern', company: 'Acme', listed: true }], placeholder: false, unseen: true })
    expect(turns).toEqual([])
    expect(results).toEqual([{ kind: 'fake-check', postingId: 'p1', dropped: false, versions: [expect.objectContaining({ chatId: chat.id, result: VERDICT('Acme is real.') })] }])
    const file = JSON.parse(readFileSync(join(app.store.dir, FILES.aiResults), 'utf8'))
    expect(file[app.userId]['p1:fake-check'].versions[0].chatId).toBe(chat.id)
    expect((await app.list()).map((c) => c.id)).toEqual([chat.id])
  })

  it('shows its result in no chat but the job\'s own', async () => {
    const app = await setup()
    await app.action('p1', 'fake-check', { chatId: app.general.id })
    expect((await app.page(app.general.id))).toMatchObject({ turns: [], results: [] })
    expect((await app.page(app.compare.id)).results).toEqual([])
    expect((await app.jobPage()).results).toHaveLength(1)
  })

  // The compare chat keeps a line saying where it went, and does not move.
  it('runs an action pressed in a comparison in the job\'s own chat, leaving a line in the comparison', async () => {
    const app = await setup()
    const record = (await app.action('p1', 'fake-check', { chatId: app.compare.id })).json()
    const { chat } = await app.jobPage()
    expect(record.chatId).toBe(chat.id)
    const compare = await app.page(app.compare.id)
    expect(compare.turns).toEqual([{
      id: expect.any(String), createdAt: expect.any(String), items: { jobs: ['p1', 'p2'], documents: [] },
      note: { kind: 'started', action: 'fake-check', label: 'Is it real?', postingId: 'p1', chatId: chat.id, title: 'Frontend Intern · Acme' },
    }])
    expect(compare.chat.unseen).toBe(false)
    expect(compare.results).toEqual([])
  })

  it('refines in the job\'s chat, the refine a version beside the first', async () => {
    const app = await setup()
    const first = (await app.action('p1', 'fake-check')).json()
    const refined = (await app.action('p1', 'fake-check', { instruction: 'check the recruiter email', chatId: first.chatId })).json()
    expect(refined.versions.map((v) => [v.instruction, v.chatId])).toEqual([['', first.chatId], ['check the recruiter email', first.chatId]])
    expect(app.prompts()[1].input).toContain('Acme is real.')
  })

  it('saves to a job chat made anew when its own was deleted while the action ran', async () => {
    const held = heldCli(answers)
    const app = await setup(held)
    const checked = app.action('p1', 'fake-check')
    await until(() => held.asked() === 1)
    const { busy } = await app.pending()
    expect((await app.call('DELETE', `/api/chats/${busy.chatId}`)).statusCode).toBe(204)
    held.release()
    const record = (await checked).json()
    expect(record.chatId).not.toBe(busy.chatId)
    expect((await app.jobPage()).chat.id).toBe(record.chatId)
    expect((await app.jobPage()).results[0].versions.map((v) => v.chatId)).toEqual([record.chatId])
  })
})
