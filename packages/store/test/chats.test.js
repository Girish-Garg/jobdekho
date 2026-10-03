import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore, FILES } from '@jobdekho/store/open.js'
import {
  listChats, getChat, homeChat, createChat, updateChat, touchChat, deleteChat,
} from '@jobdekho/store/chats.js'
import { itemsProblem, homeItem, withItem, ITEM_LIMITS } from '@jobdekho/store/chat-items.js'
import { questionTitle, jobTitle, compareTitle } from '@jobdekho/store/chat-titles.js'

let dir
let store
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-chats-')); store = openStore(dir) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const NOW = new Date('2026-10-04T09:00:00.000Z')
const LATER = new Date('2026-10-04T10:00:00.000Z')

describe('making a chat', () => {
  it('keeps the fields the design names, unseen until looked at, in chats.json keyed by user', async () => {
    expect(existsSync(join(dir, FILES.chats))).toBe(false)
    const { chat, created } = await createChat(store, 'me', { kind: 'compare', jobs: ['p1', 'p2'], title: 'Razorpay vs Writesonic' }, NOW)
    expect(created).toBe(true)
    expect(chat).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/), kind: 'compare', jobs: ['p1', 'p2'], documents: [],
      title: 'Razorpay vs Writesonic', createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), seenAt: null,
    })
    expect(JSON.parse(readFileSync(join(dir, FILES.chats), 'utf8'))).toEqual({ me: { chats: [chat] } })
    expect(await getChat(store, 'me', chat.id)).toEqual(chat)
    expect(await getChat(store, 'someone-else', chat.id)).toBeNull()
  })

  it('makes a job\'s or a document\'s own chat once, answering the one there is after that', async () => {
    const first = await createChat(store, 'me', { kind: 'job', jobs: ['p1'], title: 'Frontend Engineer' })
    const again = await createChat(store, 'me', { kind: 'job', jobs: ['p1'], title: 'Something else' })
    expect(again).toEqual({ chat: first.chat, created: false })
    const doc = await createChat(store, 'me', { kind: 'document', documents: ['d1'], jobs: ['p1'], title: 'CV' })
    expect((await createChat(store, 'me', { kind: 'document', documents: ['d1'], title: 'CV' })).chat.id).toBe(doc.chat.id)
    expect(await homeChat(store, 'me', 'job', 'p1')).toEqual(first.chat)
    expect(await homeChat(store, 'me', 'document', 'd1')).toEqual(doc.chat)
    // A document chat that holds p1 is not p1's own chat, nor a comparison.
    expect(await homeChat(store, 'me', 'job', 'p2')).toBeNull()
    expect(await listChats(store, 'me')).toHaveLength(2)
  })

  it('refuses what a kind may not hold, and a kind that does not exist', async () => {
    expect(await createChat(store, 'me', { kind: 'compare', jobs: ['p1'], title: 't' })).toEqual({ error: 'A comparison holds two to five jobs.' })
    expect(await createChat(store, 'me', { kind: 'general', jobs: ['p1'], title: 't' })).toEqual({ error: expect.stringMatching(/^A general chat holds no jobs/) })
    expect(await createChat(store, 'me', { kind: 'thread', title: 't' })).toEqual({ error: 'There is no such kind of chat.' })
    expect(await listChats(store, 'me')).toEqual([])
  })
})

describe('what a chat may hold', () => {
  it('holds a job\'s one job, a document and two more, two to five jobs to compare, and no job in a general chat', () => {
    expect(ITEM_LIMITS).toEqual({
      job: { jobs: [1, 1], documents: [0, 3] }, document: { jobs: [0, 5], documents: [1, 3] },
      compare: { jobs: [2, 5], documents: [0, 3] }, general: { jobs: [0, 0], documents: [0, 3] },
    })
    const ids = (n, p) => Array.from({ length: n }, (_, i) => `${p}${i}`)
    expect(itemsProblem('job', { jobs: ['p1'], documents: ids(3, 'd') })).toBeNull()
    expect(itemsProblem('job', { jobs: ['p1'], documents: ids(4, 'd') })).toBe('A job\'s chat holds up to 3 documents.')
    expect(itemsProblem('document', { jobs: ids(5, 'p'), documents: ids(3, 'd') })).toBeNull()
    expect(itemsProblem('document', { jobs: ids(6, 'p'), documents: ['d0'] })).toBe('A document\'s chat holds up to 5 jobs.')
    expect(itemsProblem('compare', { jobs: ids(6, 'p') })).toBe('A comparison holds two to five jobs.')
    expect(itemsProblem('general', { documents: ids(4, 'd') })).toBe('A general chat holds up to 3 documents.')
    expect(itemsProblem('compare', { jobs: ['p1', 'p1'] })).toBe('A chat holds each of its jobs once.')
  })

  it('adds and removes one item, never the home one, and changes nothing for a repeat', () => {
    const job = { kind: 'job', jobs: ['p1'], documents: ['d1'] }
    expect(homeItem(job)).toEqual({ type: 'job', id: 'p1' })
    expect(withItem(job, { action: 'add', type: 'document', id: 'd2' })).toEqual({ jobs: ['p1'], documents: ['d1', 'd2'] })
    expect(withItem(job, { action: 'add', type: 'document', id: 'd1' })).toEqual({ jobs: ['p1'], documents: ['d1'] })
    expect(withItem(job, { action: 'remove', type: 'document', id: 'd1' })).toEqual({ jobs: ['p1'], documents: [] })
    expect(withItem(job, { action: 'remove', type: 'job', id: 'p1' })).toEqual({ error: 'The chat\'s own job stays in it.' })
    expect(withItem(job, { action: 'add', type: 'job', id: 'p2' })).toEqual({ error: expect.stringMatching(/starts a comparison/) })
    const doc = { kind: 'document', jobs: [], documents: ['d1'] }
    expect(withItem(doc, { action: 'remove', type: 'document', id: 'd1' })).toEqual({ error: 'The chat\'s own document stays in it.' })
    const compare = { kind: 'compare', jobs: ['p1', 'p2'], documents: [] }
    expect(homeItem(compare)).toBeNull()
    expect(withItem(compare, { action: 'remove', type: 'job', id: 'p2' })).toEqual({ error: 'A comparison holds two to five jobs.' })
    expect(withItem(compare, { action: 'swap', type: 'job', id: 'p3' })).toEqual({ error: 'Say whether to add or remove it.' })
    expect(withItem(compare, { action: 'add', type: 'posting', id: 'p3' })).toEqual({ error: 'Say which job or document to add or remove.' })
  })
})

describe('changing a chat', () => {
  it('moves updatedAt for a change, keeps it for a look, and lists the newest first', async () => {
    const { chat: a } = await createChat(store, 'me', { kind: 'general', title: 'New chat' }, NOW)
    const { chat: b } = await createChat(store, 'me', { kind: 'general', title: 'Older' }, new Date('2026-10-03T00:00:00.000Z'))
    expect((await listChats(store, 'me')).map((c) => c.id)).toEqual([a.id, b.id])
    const seen = await updateChat(store, 'me', b.id, { seenAt: LATER.toISOString() }, LATER)
    expect(seen.updatedAt).toBe(b.updatedAt)
    expect((await listChats(store, 'me')).map((c) => c.id)).toEqual([a.id, b.id])
    expect((await touchChat(store, 'me', b.id, LATER)).updatedAt).toBe(LATER.toISOString())
    expect((await listChats(store, 'me')).map((c) => c.id)).toEqual([b.id, a.id])
    expect((await updateChat(store, 'me', a.id, { title: 'Renamed' }, LATER)).title).toBe('Renamed')
    expect(await updateChat(store, 'me', 'nope', { title: 'x' })).toBeNull()
  })

  it('deletes, once, and only the person\'s own', async () => {
    const { chat } = await createChat(store, 'me', { kind: 'general', title: 'New chat' })
    expect(await deleteChat(store, 'someone-else', chat.id)).toBe(false)
    expect(await deleteChat(store, 'me', chat.id)).toBe(true)
    expect(await deleteChat(store, 'me', chat.id)).toBe(false)
    expect(await listChats(store, 'me')).toEqual([])
  })
})

describe('chat titles', () => {
  it('names a job, a comparison and a general chat the way the switcher shows them', () => {
    expect(jobTitle({ title: 'Frontend Engineer', company: 'Razorpay' })).toBe('Frontend Engineer · Razorpay')
    expect(jobTitle(null)).toBe('A job no longer listed')
    expect(compareTitle(['Razorpay', 'Writesonic'])).toBe('Razorpay vs Writesonic')
    expect(compareTitle(['Razorpay', 'Writesonic', 'Acme', 'Zeta'])).toBe('Razorpay vs Writesonic +2')
    expect(questionTitle('  which of these\n are remote?')).toBe('which of these are remote?')
    expect(questionTitle('word '.repeat(40))).toHaveLength(80)
    expect(questionTitle('')).toBe('A conversation')
  })
})
