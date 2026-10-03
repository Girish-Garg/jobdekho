import { describe, it, expect, afterEach } from 'vitest'
import { createChat } from '@jobdekho/store/chats.js'
import { upsertProfile } from '@jobdekho/store/profiles.js'
import { createDocument } from '@jobdekho/store/documents.js'
import { chatApp, heldCli, posting, until, cleanUp } from './fixtures/chat-app.js'
import { PROFILE, PLAN } from './fixtures/tailored-resume.js'

afterEach(cleanUp)

const VERDICT = { verdict: 'genuine', stillOpen: true, summary: 'Real.', checks: [], redFlags: [] }
const LETTER = { letter: 'Dear Hiring Team,\n\nI built the portal in React.\n\nRegards', usedFromResume: [], notClaimed: [] }
const TEX = '\\documentclass{article}\n\\begin{document}\nPriya Sharma\n\\end{document}\n'

// Whatever was asked, the reply its kind of call reads.
function answers({ args, input }) {
  if (args.includes('WebSearch,WebFetch')) return VERDICT
  if (input.includes('Write a cover letter')) return LETTER
  if (input.includes('You are tailoring')) return PLAN
  return { reply: 'Two are remote.' }
}

// A general chat, a comparison of Acme and Writesonic, and a document whose
// own chat is "document:<id>", for a person with a full record and resume.
async function setup() {
  const held = heldCli(answers)
  const made = {}
  const chats = await chatApp({
    cli: held.cli,
    postings: [posting('p1', 'Frontend Intern', 'Acme'), posting('p2', 'Writer', 'Writesonic')],
    seed: async (store, userId) => {
      await upsertProfile(store, userId, { ...PROFILE, resumeText: 'PRIYA SHARMA RESUME', resumeName: 'cv.pdf' })
      made.general = (await createChat(store, userId, { kind: 'general', title: 'New chat' })).chat
      made.other = (await createChat(store, userId, { kind: 'general', title: 'New chat' })).chat
      made.compare = (await createChat(store, userId, { kind: 'compare', jobs: ['p1', 'p2'], title: 'Acme vs Writesonic' })).chat
      made.doc = await createDocument(store, userId, { name: 'Classic resume', kind: 'resume', templateId: 'classic', tex: TEX, by: 'template' })
    },
  })
  return { ...chats, ...held, ...made }
}

// Every kind of call, each into a chat of its own.
const everyCall = (app) => [
  ['a question in another chat', () => app.ask(app.other.id, 'and here?')],
  ['a question in the same chat', () => app.ask(app.general.id, 'again?')],
  ['a document edit', () => app.ask(`document:${app.doc.id}`, 'shorten it', { page: 'resume' })],
  ['a job action', () => app.action('p2', 'fake-check')],
  ['a job action in a comparison', () => app.action('p1', 'cover-letter', { chatId: app.compare.id })],
  ['tailoring for all', () => app.call('POST', `/api/chats/${app.compare.id}/tailor-all`)],
  ['a letter for each', () => app.call('POST', `/api/chats/${app.compare.id}/letters-each`)],
]

describe('one AI call at a time, across every chat', () => {
  it('refuses every other call while a question runs, names the busy chat, and queues none of them', async () => {
    const app = await setup()
    const answered = app.ask(app.general.id, 'which are remote?')
    await until(() => app.asked() === 1)
    for (const [what, call] of everyCall(app)) {
      const res = await call()
      expect(res.statusCode, what).toBe(409)
      expect(res.json(), what).toEqual({
        error: 'JobDekho is still working in "New chat" (Answering). You can send once it is done.',
        busy: { chatId: app.general.id, kind: 'question', label: 'Answering', title: 'New chat' },
      })
    }
    app.release()
    expect((await answered).statusCode).toBe(200)
    expect(app.asked()).toBe(1)
    expect((await app.page(app.compare.id)).turns).toEqual([])
    expect((await app.list()).map((c) => c.id)).toEqual([app.general.id])
  })

  it('names a running job action as the busy call, in its job\'s chat', async () => {
    const app = await setup()
    const checked = app.action('p1', 'fake-check')
    await until(() => app.asked() === 1)
    const res = await app.ask(app.general.id, 'which are remote?')
    expect(res.json().busy).toMatchObject({ kind: 'action', label: 'Is it real?', title: 'Frontend Intern \u00b7 Acme' })
    expect(res.json().busy.chatId).toBe((await app.pending()).busy.chatId)
    app.release()
    expect((await checked).statusCode).toBe(200)
  })

  it('names a running combined action, with how far it has got', async () => {
    const app = await setup()
    const letters = app.call('POST', `/api/chats/${app.compare.id}/letters-each`)
    await until(() => app.asked() === 1)
    const res = await app.action('p2', 'fake-check')
    expect(res.json().busy).toEqual({ chatId: app.compare.id, kind: 'combined', label: 'Cover letter 1 of 2', title: 'Acme vs Writesonic' })
    app.release()
    await until(() => app.asked() === 2)
    expect((await app.pending()).busy.label).toBe('Cover letter 2 of 2')
    app.release()
    expect((await letters).statusCode).toBe(200)
  })

  it('names a running document edit', async () => {
    const app = await setup()
    const edit = app.ask(`document:${app.doc.id}`, 'shorten it', { page: 'resume' })
    await until(() => app.asked() === 1)
    const res = await app.action('p1', 'fake-check')
    expect(res.json().busy).toMatchObject({ kind: 'edit', label: 'Answering', title: 'Classic resume' })
    app.release()
    expect((await edit).statusCode).toBe(200)
    // Free again: the next call runs.
    const next = app.action('p1', 'fake-check')
    await until(() => app.asked() === 2)
    app.release()
    expect((await next).statusCode).toBe(200)
  })
})
