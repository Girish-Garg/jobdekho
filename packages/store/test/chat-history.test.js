import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore, FILES } from '@jobdekho/store/open.js'
import { getChatHistory, appendChatTurn, clearChatHistory, MAX_TURNS } from '@jobdekho/store/chat-history.js'

let dir
let store
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-chat-')); store = openStore(dir) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const turn = (n) => ({ question: `Q${n}`, answer: `A${n}`, provider: 'claude', createdAt: `2026-09-${10 + n}T00:00:00.000Z` })

describe('chat history', () => {
  it('is empty before anything was asked, and writes no file for that', async () => {
    expect(await getChatHistory(store, 'me')).toEqual([])
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

  it('starting a new conversation clears it for that user only', async () => {
    await appendChatTurn(store, 'me', turn(1))
    await appendChatTurn(store, 'other', turn(1))
    await clearChatHistory(store, 'me')
    expect(await getChatHistory(store, 'me')).toEqual([])
    expect(await getChatHistory(store, 'other')).toEqual([turn(1)])
  })
})
