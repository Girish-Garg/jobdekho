import { describe, it, expect, afterEach } from 'vitest'
import { createChat, getChat } from '@jobdekho/store/chats.js'
import { appendChatTurn } from '@jobdekho/store/chat-messages.js'
import { createDocument } from '@jobdekho/store/documents.js'
import { blockCompany } from '@jobdekho/store/blocked-companies.js'
import { chatApp, heldCli, answeringCli, posting, until, cleanUp } from './fixtures/chat-app.js'

afterEach(cleanUp)

const TEX = '\\documentclass{article}\n\\begin{document}\nPriya\n\\end{document}\n'
const VERDICT = { verdict: 'genuine', stillOpen: true, summary: 'Real.', checks: [], redFlags: [] }
const answers = ({ args }) => (args.includes('WebSearch,WebFetch') ? VERDICT : { reply: 'Two are remote.' })

async function setup(cli = answeringCli(answers)) {
  const made = {}
  const chats = await chatApp({
    cli: cli.cli,
    postings: [posting('p1', 'Frontend Intern', 'Acme'), posting('p2', 'Writer', 'Writesonic'), posting('p3', 'Analyst', 'Zeta')],
    seed: async (store, userId) => {
      made.cv = await createDocument(store, userId, { name: 'Classic resume', kind: 'resume', templateId: 'classic', tex: TEX, by: 'template' })
      made.letter = await createDocument(store, userId, { name: 'Letter', kind: 'cover-letter', templateId: 'letter', tex: TEX, by: 'template' })
    },
  })
  const items = (id, body) => chats.call('POST', `/api/chats/${id}/items`, body)
  return { ...chats, ...cli, ...made, items }
}

describe('reading the chats', () => {
  it('needs the session cookie', async () => {
    const { app } = await setup()
    for (const url of ['/api/chats', '/api/chats/pending', '/api/chats/for-job/p1', '/api/chats/x/messages']) {
      expect((await app.inject({ method: 'GET', url })).statusCode, url).toBe(401)
    }
  })

  it('lists only chats with something in them, newest first, with their items, and whether each has an unseen answer', async () => {
    const app = await setup()
    const empty = await app.newChat()
    await app.ask('job:p1', 'is it remote?')
    const general = await app.newChat()
    expect(general.id).toBe(empty.id)
    await app.ask(general.id, 'which are remote?')
    const list = await app.list()
    expect(list.map((c) => c.title)).toEqual(['which are remote?', 'Frontend Intern \u00b7 Acme'])
    expect(list[1]).toEqual({
      id: expect.any(String), kind: 'job', title: 'Frontend Intern \u00b7 Acme',
      jobs: [{ id: 'p1', title: 'Frontend Intern', company: 'Acme', listed: true }], documents: [],
      createdAt: expect.any(String), updatedAt: expect.any(String), seenAt: null,
      listed: true, unseen: true, busy: false, waiting: false, failed: false, placeholder: false,
    })
    const seen = (await app.call('POST', `/api/chats/${list[1].id}/seen`)).json().chat
    expect(seen).toMatchObject({ unseen: false, seenAt: expect.any(String), updatedAt: list[1].updatedAt })
  })

  it('opens a job\'s or a document\'s chat before it exists as an empty placeholder, and 404s what is not there', async () => {
    const app = await setup()
    expect(await (async () => (await app.call('GET', '/api/chats/for-job/p2')).json())()).toEqual({
      chat: expect.objectContaining({ id: 'job:p2', kind: 'job', title: 'Writer \u00b7 Writesonic', placeholder: true, unseen: false }),
      turns: [], dropped: false, results: [],
    })
    const doc = (await app.call('GET', `/api/chats/for-document/${app.cv.id}`)).json()
    expect(doc.chat).toMatchObject({ id: `document:${app.cv.id}`, kind: 'document', title: 'Classic resume', documents: [{ id: app.cv.id, name: 'Classic resume', kind: 'resume', exists: true }] })
    expect((await app.call('GET', '/api/chats/for-job/nope')).json()).toEqual({ error: 'no such posting' })
    expect((await app.call('GET', '/api/chats/for-document/nope')).json()).toEqual({ error: 'That document is not there any more.' })
    expect((await app.call('GET', '/api/chats/nope/messages')).statusCode).toBe(404)
  })

  it('still opens a job\'s chat once its job is gone or blocked, marked no longer listed', async () => {
    const app = await setup()
    await app.ask('job:p1', 'is it remote?')
    await blockCompany(app.store, app.userId, { name: 'Acme' })
    const page = (await app.call('GET', '/api/chats/for-job/p1')).json()
    expect(page.chat).toMatchObject({ kind: 'job', listed: false, jobs: [{ id: 'p1', listed: false }] })
    expect(page.turns).toHaveLength(1)
  })

  it('says older messages were removed when a chat passed its 200', async () => {
    const app = await setup()
    const chat = (await createChat(app.store, app.userId, { kind: 'general', title: 'Long' })).chat
    for (let i = 0; i < 201; i += 1) await appendChatTurn(app.store, app.userId, chat.id, { question: `q${i}`, answer: 'a', createdAt: new Date().toISOString(), items: { jobs: [], documents: [] } })
    expect(await app.page(chat.id)).toMatchObject({ dropped: true, turns: expect.any(Array) })
    expect((await app.page(chat.id)).turns).toHaveLength(200)
  })
})

describe('POST /api/chats', () => {
  it('makes a general chat, and opens the same empty one when asked again', async () => {
    const app = await setup()
    const res = await app.call('POST', '/api/chats', { kind: 'general' })
    expect(res.statusCode).toBe(201)
    expect(res.json().chat).toMatchObject({ kind: 'general', title: 'New chat', jobs: [], documents: [], placeholder: false })
    const again = await app.call('POST', '/api/chats', { kind: 'general' })
    expect(again.statusCode).toBe(200)
    expect(again.json().chat.id).toBe(res.json().chat.id)
    const withDoc = await app.call('POST', '/api/chats', { kind: 'general', documents: [app.cv.id] })
    expect(withDoc.statusCode).toBe(201)
  })

  it('makes a comparison named for its companies', async () => {
    const app = await setup()
    const res = await app.call('POST', '/api/chats', { kind: 'compare', jobs: ['p1', 'p2', 'p3'] })
    expect(res.statusCode).toBe(201)
    expect(res.json().chat).toMatchObject({ kind: 'compare', title: 'Acme vs Writesonic +1', jobs: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }] })
  })

  it('refuses another kind, items a kind may not hold, and items the person does not have', async () => {
    const app = await setup()
    const refused = async (body) => (await app.call('POST', '/api/chats', body)).json()
    expect(await refused({ kind: 'job', jobs: ['p1'] })).toEqual({ error: 'A job\'s or a document\'s own chat is made when it is first used.' })
    expect(await refused({ kind: 'thread' })).toEqual({ error: 'Say whether this is a general chat or a comparison of jobs.' })
    expect(await refused({ kind: 'compare', jobs: ['p1'] })).toEqual({ error: 'A comparison holds two to five jobs.' })
    expect(await refused({ kind: 'general', jobs: ['p1'] })).toEqual({ error: 'A general chat holds no jobs. Compare jobs in a chat of their own.' })
    expect(await refused({ kind: 'compare', jobs: ['p1', 7] })).toEqual({ error: 'Name the jobs and documents by their ids.' })
    expect((await app.call('POST', '/api/chats', { kind: 'compare', jobs: ['p1', 'gone'] })).statusCode).toBe(404)
  })
})

describe('POST /api/chats/:id/items', () => {
  it('adds a document to a job\'s chat in place, making the chat when it had none', async () => {
    const app = await setup()
    const res = await app.items('job:p1', { action: 'add', type: 'document', id: app.cv.id })
    expect(res.statusCode).toBe(200)
    expect(res.json().chat).toMatchObject({ kind: 'job', placeholder: false, documents: [{ id: app.cv.id, exists: true }] })
    expect((await app.call('GET', '/api/chats/for-job/p1')).json().chat.id).toBe(res.json().chat.id)
  })

  // The job's own chat stays only about that job.
  it('starts a comparison when a job is added to a job\'s chat, and opens the same one when asked again', async () => {
    const app = await setup()
    await app.ask('job:p1', 'is it remote?')
    const own = (await app.call('GET', '/api/chats/for-job/p1')).json().chat
    const res = await app.items(own.id, { action: 'add', type: 'job', id: 'p2' })
    expect(res.statusCode).toBe(201)
    expect(res.json().chat).toMatchObject({ kind: 'compare', title: 'Acme vs Writesonic', jobs: [{ id: 'p1' }, { id: 'p2' }] })
    expect((await app.page(own.id)).chat.jobs.map((j) => j.id)).toEqual(['p1'])
    expect((await app.items(own.id, { action: 'add', type: 'job', id: 'p2' })).statusCode).toBe(200)
  })

  it('changes a comparison in place and renames it, but never below two jobs', async () => {
    const app = await setup()
    const compare = await app.newChat({ kind: 'compare', jobs: ['p1', 'p2'] })
    expect((await app.items(compare.id, { action: 'add', type: 'job', id: 'p3' })).json().chat.title).toBe('Acme vs Writesonic +1')
    expect((await app.items(compare.id, { action: 'remove', type: 'job', id: 'p1' })).json().chat.title).toBe('Writesonic vs Zeta')
    expect((await app.items(compare.id, { action: 'remove', type: 'job', id: 'p2' })).json()).toEqual({ error: 'A comparison holds two to five jobs.' })
    expect((await app.items(compare.id, { action: 'add', type: 'job', id: 'p2' })).json().chat.jobs.map((j) => j.id)).toEqual(['p2', 'p3'])
  })

  it('refuses the home item\'s removal, what the kind may not hold, and items that are not there', async () => {
    const app = await setup()
    const own = (await app.items('job:p1', { action: 'add', type: 'document', id: app.cv.id })).json().chat
    expect((await app.items(own.id, { action: 'remove', type: 'job', id: 'p1' })).json()).toEqual({ error: 'The chat\'s own job stays in it.' })
    expect((await app.items(own.id, { action: 'add', type: 'document', id: 'nope' })).json()).toEqual({ error: 'That document is not there any more.' })
    expect((await app.items(own.id, { action: 'swap', type: 'job', id: 'p2' })).statusCode).toBe(400)
    const general = await app.newChat()
    expect((await app.items(general.id, { action: 'add', type: 'job', id: 'p1' })).statusCode).toBe(400)
    expect((await app.items(`document:${app.cv.id}`, { action: 'remove', type: 'document', id: app.cv.id })).json()).toEqual({ error: 'The chat\'s own document stays in it.' })
    expect((await app.items('nope', { action: 'add', type: 'job', id: 'p1' })).statusCode).toBe(404)
  })
})

describe('clearing and deleting a chat', () => {
  it('clears its messages and the results shown in it, which stay with their job, and the list no longer shows it', async () => {
    const app = await setup()
    const record = (await app.action('p1', 'fake-check')).json()
    await app.ask(record.chatId, 'why genuine?')
    const cleared = await app.call('POST', `/api/chats/${record.chatId}/clear`)
    expect(cleared.json().chat).toMatchObject({ id: record.chatId, unseen: false })
    expect(await app.page(record.chatId)).toMatchObject({ turns: [], results: [], dropped: false })
    expect((await app.call('GET', '/api/postings/p1/ai')).json().results).toHaveLength(1)
    expect(await app.list()).toEqual([])
    expect((await app.call('POST', '/api/chats/nope/clear')).statusCode).toBe(404)
  })

  it('deletes once, keeping the results with their job', async () => {
    const app = await setup()
    const record = (await app.action('p1', 'fake-check')).json()
    expect((await app.call('DELETE', `/api/chats/${record.chatId}`)).statusCode).toBe(204)
    expect((await app.call('DELETE', `/api/chats/${record.chatId}`)).statusCode).toBe(404)
    expect(await getChat(app.store, app.userId, record.chatId)).toBeNull()
    expect((await app.call('GET', '/api/postings/p1/ai')).json().results).toHaveLength(1)
    expect((await app.call('GET', '/api/chats/for-job/p1')).json().chat.placeholder).toBe(true)
  })

  // Never lost: it lands in a general chat titled after the question.
  it('saves an answer whose chat was deleted while it ran to a new general chat', async () => {
    const held = heldCli(answers)
    const app = await setup(held)
    const asked = app.ask('job:p1', 'is the team remote?')
    await until(() => held.asked() === 1)
    const { busy } = await app.pending()
    expect((await app.call('DELETE', `/api/chats/${busy.chatId}`)).statusCode).toBe(204)
    held.release()
    const turn = (await asked).json()
    expect(turn.chatId).not.toBe(busy.chatId)
    expect((await app.page(turn.chatId)).chat).toMatchObject({ kind: 'general', title: 'is the team remote?', jobs: [] })
    expect((await app.page(turn.chatId)).turns[0]).toMatchObject({ question: 'is the team remote?', items: { jobs: ['p1'], documents: [] } })
  })
})
