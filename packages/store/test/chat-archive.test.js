import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore, FILES } from '@jobdekho/store/open.js'
import { appendChatTurn, currentConversationId, getCurrentConversation } from '@jobdekho/store/chat-history.js'
import {
  listConversations, getConversation, deleteConversation, appendToFiled, MAX_FILED,
} from '@jobdekho/store/chat-archive.js'
import { fileAwayConversation, continueConversation } from '@jobdekho/store/chat-switch.js'

let dir
let store
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-archive-')); store = openStore(dir) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const turn = (question, day = 10) => ({ question, answer: 'A', provider: 'claude', createdAt: `2026-09-${day}T00:00:00.000Z` })
const NOW = new Date('2026-09-30T12:00:00.000Z')

async function converse(questions, day) {
  for (const q of questions) await appendChatTurn(store, 'me', turn(q, day))
  return fileAwayConversation(store, 'me', NOW)
}

describe('filing a conversation away', () => {
  it('keeps it, titled by its first question, with its dates and turn count, and starts a fresh one', async () => {
    const { current, filed } = await converse(['  which of these\n are remote?', 'thanks'], 12)
    expect(filed).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/), title: 'which of these are remote?',
      startedAt: '2026-09-12T00:00:00.000Z', endedAt: '2026-09-12T00:00:00.000Z', turnCount: 2,
    })
    expect(current).toEqual({ id: expect.any(String), startedAt: NOW.toISOString(), turns: [] })
    expect(current.id).not.toBe(filed.id)
    expect(await getCurrentConversation(store, 'me')).toEqual(current)
    expect(await listConversations(store, 'me')).toEqual([filed])
    expect(existsSync(join(dir, FILES.chatArchive))).toBe(true)
  })

  it('files nothing for a conversation with no saved turns', async () => {
    const { filed } = await fileAwayConversation(store, 'me', NOW)
    expect(filed).toBeNull()
    expect(await listConversations(store, 'me')).toEqual([])
  })

  it('keeps a filed conversation\'s id, so an answer on its way still finds it', async () => {
    const id = await currentConversationId(store, 'me')
    const { filed } = await converse(['q'], 10)
    expect(filed.id).toBe(id)
  })

  it('shortens a long first question to a title', async () => {
    const { filed } = await converse(['word '.repeat(40)], 10)
    expect(filed.title).toHaveLength(80)
    expect(filed.title.endsWith('...')).toBe(true)
  })

  it(`lists newest first and keeps the last ${MAX_FILED}, dropping the one with the oldest activity`, async () => {
    for (let i = 0; i < MAX_FILED + 2; i += 1) await converse([`q${i}`], 10 + (i % 20))
    const list = await listConversations(store, 'me')
    expect(list).toHaveLength(MAX_FILED)
    expect(list.map((c) => c.endedAt)).toEqual([...list.map((c) => c.endedAt)].sort().reverse())
    expect(list.some((c) => c.title === 'q0')).toBe(false)
  })
})

describe('a filed conversation', () => {
  it('opens whole, and is null for an id that is not there or not this person\'s', async () => {
    const { filed } = await converse(['q1', 'q2'], 10)
    expect((await getConversation(store, 'me', filed.id)).turns.map((t) => t.question)).toEqual(['q1', 'q2'])
    expect(await getConversation(store, 'me', 'nope')).toBeNull()
    expect(await getConversation(store, 'other', filed.id)).toBeNull()
  })

  it('continues as the current one, filing the current one in its place', async () => {
    const { filed: first } = await converse(['old'], 10)
    await appendChatTurn(store, 'me', turn('newer', 11))
    const now = await continueConversation(store, 'me', first.id, NOW)
    expect(now).toEqual({ id: first.id, startedAt: first.startedAt, turns: [expect.objectContaining({ question: 'old' })] })
    expect((await getCurrentConversation(store, 'me')).id).toBe(first.id)
    expect((await listConversations(store, 'me')).map((c) => c.title)).toEqual(['newer'])
    expect(await continueConversation(store, 'me', 'nope', NOW)).toBeNull()
  })

  it('deletes, once', async () => {
    const { filed } = await converse(['q'], 10)
    expect(await deleteConversation(store, 'me', filed.id)).toBe(true)
    expect(await deleteConversation(store, 'me', filed.id)).toBe(false)
    expect(await listConversations(store, 'me')).toEqual([])
  })

  it('takes a late answer, and files one whose conversation kept nothing as its own', async () => {
    const { filed } = await converse(['q1'], 10)
    await appendToFiled(store, 'me', filed.id, turn('q2', 14))
    expect(await getConversation(store, 'me', filed.id)).toMatchObject({ turnCount: 2, endedAt: '2026-09-14T00:00:00.000Z' })
    await appendToFiled(store, 'me', 'emptied', turn('lonely', 15))
    expect((await listConversations(store, 'me'))[0]).toMatchObject({ id: 'emptied', title: 'lonely', turnCount: 1 })
  })
})
