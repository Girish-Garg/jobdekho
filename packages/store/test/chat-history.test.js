import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore, FILES } from '@jobdekho/store/open.js'
import {
  getChatHistory, getCurrentConversation, currentConversationId, appendChatTurn, MAX_TURNS,
} from '@jobdekho/store/chat-history.js'
import { getConversation } from '@jobdekho/store/chat-archive.js'
import { fileAwayConversation } from '@jobdekho/store/chat-switch.js'

let dir
let store
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-chat-')); store = openStore(dir) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const turn = (n) => ({ question: `Q${n}`, answer: `A${n}`, provider: 'claude', createdAt: `2026-09-${10 + n}T00:00:00.000Z` })

describe('chat history', () => {
  it('is empty before anything was asked, and writes no file for that', async () => {
    expect(await getChatHistory(store, 'me')).toEqual([])
    expect(await getCurrentConversation(store, 'me')).toEqual({ id: null, startedAt: null, turns: [] })
    expect(existsSync(join(dir, FILES.chatHistory))).toBe(false)
  })

  it('appends a turn and reads it back, scoped to the user who asked', async () => {
    await appendChatTurn(store, 'me', turn(1))
    expect(await getChatHistory(store, 'me')).toEqual([turn(1)])
    expect(await getChatHistory(store, 'someone-else')).toEqual([])
  })

  it('keeps turns in the order they were asked', async () => {
    await appendChatTurn(store, 'me', turn(1))
    await appendChatTurn(store, 'me', turn(2))
    expect(await getChatHistory(store, 'me')).toEqual([turn(1), turn(2)])
  })

  it(`caps the conversation at ${MAX_TURNS} turns, dropping the oldest`, async () => {
    for (let i = 0; i < MAX_TURNS + 5; i += 1) await appendChatTurn(store, 'me', turn(i))
    const history = await getChatHistory(store, 'me')
    expect(history).toHaveLength(MAX_TURNS)
    expect(history[0]).toEqual(turn(5))
    expect(history.at(-1)).toEqual(turn(MAX_TURNS + 4))
  })

  // The file as the single-conversation version wrote it: { turns } alone.
  it('reads a conversation saved before ids existed, and gives it one only when asked', async () => {
    writeFileSync(join(dir, FILES.chatHistory), JSON.stringify({ me: { turns: [turn(1)] } }))
    expect(await getCurrentConversation(store, 'me')).toEqual({ id: null, startedAt: turn(1).createdAt, turns: [turn(1)] })
    const id = await currentConversationId(store, 'me')
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(await currentConversationId(store, 'me')).toBe(id)
    expect(await getCurrentConversation(store, 'me')).toEqual({ id, startedAt: turn(1).createdAt, turns: [turn(1)] })
  })

  it('saves an answer to the conversation it was asked in, even once that one was filed away', async () => {
    const asked = await currentConversationId(store, 'me')
    await appendChatTurn(store, 'me', { ...turn(1), conversationId: asked })
    await fileAwayConversation(store, 'me')
    await appendChatTurn(store, 'me', { ...turn(2), conversationId: asked })
    expect(await getChatHistory(store, 'me')).toEqual([])
    expect((await getConversation(store, 'me', asked)).turns.map((t) => t.question)).toEqual(['Q1', 'Q2'])
  })
})
