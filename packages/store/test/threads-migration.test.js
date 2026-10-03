import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
import { FILES, backupName } from '@jobdekho/store/files.js'
import { listChats, createChat } from '@jobdekho/store/chats.js'
import { getChatMessages } from '@jobdekho/store/chat-messages.js'
import { getAiResult } from '@jobdekho/store/ai-results.js'
import { migrateToThreads } from '@jobdekho/store/threads-migration.js'
import { writeAtomic } from '@jobdekho/store/atomic-write.js'

let dir
let warn
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'jobdekho-threads-'))
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
  rmSync(dir, { recursive: true, force: true })
})

// Shaped the way the single-conversation version wrote its three files,
// built by hand: a current conversation of two feed questions, one filed
// conversation from the Profile page, and results for a job still listed
// and for one a scrape has since dropped, saved before versions existed.
const at = (day, hour = 10) => `2026-09-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000Z`
const CURRENT = '3b0f6c1e-8a42-4c2d-9e51-0d7f2a6b4c11'
const FILED = '9c1d2e3f-4a5b-4c6d-8e7f-a1b2c3d4e5f6'
const RAZORPAY = 'a1b2c3d4e5f60718'
const GONE = 'ffeeddccbbaa9988'

const feedTurn = (id, question, hour) => ({
  id, page: 'postings', question, answer: `About "${question}": two of the top five.`,
  actions: [{ type: 'sort', value: 'newest', label: 'Sort by newest first' }],
  refs: [{ id: RAZORPAY, title: 'Frontend Engineer', company: 'Razorpay', fit: 61 }],
  proposals: [], provider: 'claude', memory: [], createdAt: at(20, hour), conversationId: CURRENT,
})
const HISTORY = { local: { id: CURRENT, startedAt: at(20, 9), turns: [feedTurn('t1', 'Which of these are remote?', 9), feedTurn('t2', 'And which pay over 20 lakh?', 10)] } }
const PROFILE_TURN = {
  id: 't0', page: 'profile', question: 'add my CLI tool to projects', answer: 'Here is the project as a change you can apply.',
  actions: [], refs: [], provider: 'agy', memory: [], createdAt: at(12, 11), conversationId: FILED,
  proposals: [{ id: 'prop-1', kind: 'profile', summary: 'Add the CLI tool', status: 'applied', appliedAt: at(12, 12), ops: [], diff: [] }],
}
const ARCHIVE = { local: { conversations: [{ id: FILED, title: 'add my CLI tool to projects', startedAt: at(12, 11), endedAt: at(12, 11), turns: [PROFILE_TURN] }] } }
const version = (day, result, instruction = '') => ({ instruction, provider: 'claude', createdAt: at(day), result })
const RESULTS = {
  local: {
    [`${RAZORPAY}:fake-check`]: {
      kind: 'fake-check', postingId: RAZORPAY, provider: 'claude', createdAt: at(18), result: { verdict: 'genuine' }, dropped: false,
      versions: [version(15, { verdict: 'unclear' }), version(18, { verdict: 'genuine' }, 'check the recruiter email')],
    },
    [`${RAZORPAY}:cover-letter`]: { kind: 'cover-letter', postingId: RAZORPAY, provider: 'claude', createdAt: at(16), result: { letter: 'Dear Hiring Team at Razorpay,' }, dropped: false, versions: [version(16, { letter: 'Dear Hiring Team at Razorpay,' })] },
    [`${GONE}:cover-letter`]: { kind: 'cover-letter', postingId: GONE, provider: 'agy', createdAt: at(3), result: { letter: 'Dear Hiring Team,' } },
  },
}
const CORPUS = `${JSON.stringify({ id: RAZORPAY, source: 'lever', title: 'Frontend Engineer', company: 'Razorpay', url: 'u', tags: [] })}\n`

const pathOf = (name) => join(dir, name)
const text = (name) => readFileSync(pathOf(name), 'utf8')
function seed({ history = HISTORY, archive = ARCHIVE, results = RESULTS } = {}) {
  writeFileSync(pathOf(FILES.corpus), CORPUS)
  for (const [name, value] of [[FILES.chatHistory, history], [FILES.chatArchive, archive], [FILES.aiResults, results]]) {
    if (value !== null) writeFileSync(pathOf(name), typeof value === 'string' ? value : JSON.stringify(value, null, 2))
  }
}
const byTitle = (chats) => Object.fromEntries(chats.map((chat) => [chat.title, chat]))

describe('moving the old chat files into chats', () => {
  it('makes the current and every filed conversation a general chat, with its title, its dates and its turns', async () => {
    seed()
    const store = openStore(dir)
    const chats = byTitle(await listChats(store, 'local'))
    expect(chats['Which of these are remote?']).toEqual({
      id: CURRENT, kind: 'general', jobs: [], documents: [], title: 'Which of these are remote?',
      createdAt: at(20, 9), updatedAt: at(20, 10), seenAt: at(20, 10),
    })
    expect(chats['add my CLI tool to projects']).toMatchObject({ id: FILED, kind: 'general', createdAt: at(12, 11), updatedAt: at(12, 11) })
    const { turns, dropped } = await getChatMessages(store, 'local', CURRENT)
    const { conversationId, ...first } = HISTORY.local.turns[0]
    expect(turns[0]).toEqual({ ...first, items: { jobs: [], documents: [] } })
    expect(turns.map((t) => t.question)).toEqual(['Which of these are remote?', 'And which pay over 20 lakh?'])
    expect(dropped).toBe(false)
    expect((await getChatMessages(store, 'local', FILED)).turns[0].proposals[0]).toMatchObject({ id: 'prop-1', status: 'applied' })
    expect(warn).not.toHaveBeenCalled()
  })

  it('gives every posting with results a job chat, and each of its versions that chat\'s id', async () => {
    seed()
    const store = openStore(dir)
    const chats = byTitle(await listChats(store, 'local'))
    const listed = chats['Frontend Engineer · Razorpay']
    expect(listed).toMatchObject({ kind: 'job', jobs: [RAZORPAY], documents: [], createdAt: at(15), updatedAt: at(18), seenAt: at(18) })
    expect(chats['A job no longer listed']).toMatchObject({ kind: 'job', jobs: [GONE], createdAt: at(3) })
    const check = await getAiResult(store, 'local', RAZORPAY, 'fake-check')
    expect(check.versions.map((v) => [v.instruction, v.chatId])).toEqual([['', listed.id], ['check the recruiter email', listed.id]])
    expect(check.chatId).toBe(listed.id)
    expect((await getAiResult(store, 'local', RAZORPAY, 'cover-letter')).versions[0].chatId).toBe(listed.id)
    const old = await getAiResult(store, 'local', GONE, 'cover-letter')
    expect(old.versions).toEqual([{ instruction: '', provider: 'agy', createdAt: at(3), result: { letter: 'Dear Hiring Team,' }, chatId: chats['A job no longer listed'].id }])
    expect(await listChats(store, 'local')).toHaveLength(4)
  })

  it('keeps each original byte for byte as *.pre-threads.json, and deletes nothing', () => {
    seed()
    const before = Object.fromEntries([FILES.chatHistory, FILES.chatArchive, FILES.aiResults].map((name) => [name, text(name)]))
    openStore(dir)
    for (const [name, original] of Object.entries(before)) expect(text(backupName(name))).toBe(original)
    expect(text(FILES.chatHistory)).toBe(before[FILES.chatHistory])
    expect(text(FILES.chatArchive)).toBe(before[FILES.chatArchive])
    expect(text(FILES.aiResults)).not.toBe(before[FILES.aiResults])
    expect(readdirSync(dir).sort()).toEqual([
      FILES.aiResults, backupName(FILES.aiResults), FILES.chatArchive, backupName(FILES.chatArchive),
      FILES.chatHistory, backupName(FILES.chatHistory), FILES.chatMessages, FILES.chats, FILES.corpus,
    ].sort())
  })

  it('runs once: opening the folder again changes nothing', async () => {
    seed()
    openStore(dir)
    const after = Object.fromEntries(readdirSync(dir).map((name) => [name, text(name)]))
    const again = openStore(dir)
    expect(Object.fromEntries(readdirSync(dir).map((name) => [name, text(name)]))).toEqual(after)
    expect(await listChats(again, 'local')).toHaveLength(4)
  })

  it('names a conversation saved before ids existed the same way on every run', async () => {
    const legacy = { local: { turns: [{ question: 'which are remote?', answer: 'Two.', createdAt: at(1) }] } }
    seed({ history: legacy, archive: null, results: null })
    const [chat] = await listChats(openStore(dir), 'local')
    expect(chat).toMatchObject({ kind: 'general', title: 'which are remote?', createdAt: at(1) })
    expect(chat.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/)
    const other = mkdtempSync(join(tmpdir(), 'jobdekho-threads-'))
    writeFileSync(join(other, FILES.chatHistory), JSON.stringify(legacy))
    expect((await listChats(openStore(other), 'local'))[0].id).toBe(chat.id)
    rmSync(other, { recursive: true, force: true })
  })

  it('gives results their job chats in a folder that never had a conversation, and backs up only those', async () => {
    seed({ history: null, archive: null })
    const store = openStore(dir)
    expect((await listChats(store, 'local')).map((c) => c.kind)).toEqual(['job', 'job'])
    expect(existsSync(pathOf(backupName(FILES.aiResults)))).toBe(true)
    expect(existsSync(pathOf(backupName(FILES.chatHistory)))).toBe(false)
  })

  it('leaves a folder from today alone', () => {
    openStore(dir)
    expect(readdirSync(dir)).toEqual([])
  })
})

describe('a move that fails', () => {
  it('leaves the old files as they were, says why, opens without chats, and is tried again on the next start', async () => {
    seed({ archive: '{"local":{"conversations":[{"id":' })
    const before = Object.fromEntries([FILES.chatHistory, FILES.chatArchive, FILES.aiResults].map((name) => [name, text(name)]))
    const store = openStore(dir)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toMatch(/could not move the chats .* tried again on the next start/)
    expect(await listChats(store, 'local')).toEqual([])
    for (const [name, original] of Object.entries(before)) expect(text(name)).toBe(original)
    expect(readdirSync(dir).filter((name) => name.includes('pre-threads') || [FILES.chats, FILES.chatMessages].includes(name))).toEqual([])
    writeFileSync(pathOf(FILES.chatArchive), JSON.stringify(ARCHIVE))
    expect(await listChats(openStore(dir), 'local')).toHaveLength(4)
  })

  it('keeps the chats made while it waited, and gives a job the one chat it already has', async () => {
    seed({ archive: '{broken' })
    const store = openStore(dir)
    const { chat: own } = await createChat(store, 'local', { kind: 'job', jobs: [RAZORPAY], title: 'Frontend Engineer at Razorpay' })
    const { chat: mine } = await createChat(store, 'local', { kind: 'general', title: 'New chat' })
    writeFileSync(pathOf(FILES.chatArchive), JSON.stringify(ARCHIVE))
    const reopened = openStore(dir)
    const chats = await listChats(reopened, 'local')
    expect(chats.map((c) => c.id)).toEqual(expect.arrayContaining([own.id, mine.id, CURRENT, FILED]))
    expect(chats.filter((c) => c.kind === 'job' && c.jobs[0] === RAZORPAY)).toHaveLength(1)
    expect((await getAiResult(reopened, 'local', RAZORPAY, 'fake-check')).versions.every((v) => v.chatId === own.id)).toBe(true)
  })

  it('puts the results back when a later write fails, and the next run makes each chat once', async () => {
    const store = openStore(dir)
    seed()
    const original = text(FILES.aiResults)
    const failing = (path, value) => {
      if (path.endsWith(backupName(FILES.chatHistory))) throw new Error('disk full')
      writeAtomic(path, value)
    }
    const log = vi.fn()
    expect(migrateToThreads(store, { log, write: failing })).toEqual({ migrated: false, error: 'disk full' })
    expect(log.mock.calls[0][0]).toContain('disk full')
    expect(text(FILES.aiResults)).toBe(original)
    expect(existsSync(pathOf(backupName(FILES.chatHistory)))).toBe(false)
    expect(migrateToThreads(store, { log })).toEqual({ migrated: true })
    const ids = (await listChats(store, 'local')).map((c) => c.id)
    expect(ids).toHaveLength(4)
    expect(new Set(ids).size).toBe(4)
    expect(text(backupName(FILES.aiResults))).toBe(original)
  })
})
