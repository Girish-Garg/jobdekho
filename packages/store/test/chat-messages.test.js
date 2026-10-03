import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore, FILES } from '@jobdekho/store/open.js'
import {
  getChatMessages, appendChatTurn, clearChatMessages, deleteChatMessages, allChatMessages, MAX_CHAT_TURNS,
} from '@jobdekho/store/chat-messages.js'

let dir
let store
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-messages-')); store = openStore(dir) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const ITEMS = { jobs: ['p1'], documents: [] }
const turn = (n) => ({ id: `t${n}`, question: `Q${n}`, answer: `A${n}`, provider: 'claude', createdAt: `2026-10-0${1 + (n % 9)}T00:00:00.000Z`, items: ITEMS })

describe('a chat\'s turns', () => {
  it('are none before anything was asked, and nothing is written for that', async () => {
    expect(await getChatMessages(store, 'me', 'c1')).toEqual({ turns: [], dropped: false })
    expect(existsSync(join(dir, FILES.chatMessages))).toBe(false)
  })

  it('are kept per chat and per person, in the order asked, with what the chat held', async () => {
    await appendChatTurn(store, 'me', 'c1', turn(1))
    await appendChatTurn(store, 'me', 'c2', turn(2))
    await appendChatTurn(store, 'me', 'c1', turn(3))
    expect((await getChatMessages(store, 'me', 'c1')).turns).toEqual([turn(1), turn(3)])
    expect((await getChatMessages(store, 'me', 'c2')).turns).toEqual([turn(2)])
    expect((await getChatMessages(store, 'someone-else', 'c1')).turns).toEqual([])
    const file = JSON.parse(readFileSync(join(dir, FILES.chatMessages), 'utf8'))
    expect(file.me.c1).toEqual({ turns: [turn(1), turn(3)], dropped: false })
    expect(Object.keys(allChatMessages(store, 'me'))).toEqual(['c1', 'c2'])
  })

  it(`keep the newest ${MAX_CHAT_TURNS}, and say that older ones were removed rather than losing them silently`, async () => {
    expect(MAX_CHAT_TURNS).toBe(200)
    for (let i = 0; i < MAX_CHAT_TURNS; i += 1) await appendChatTurn(store, 'me', 'c1', turn(i))
    expect(await getChatMessages(store, 'me', 'c1')).toMatchObject({ dropped: false })
    await appendChatTurn(store, 'me', 'c1', turn(MAX_CHAT_TURNS))
    const { turns, dropped } = await getChatMessages(store, 'me', 'c1')
    expect(turns).toHaveLength(MAX_CHAT_TURNS)
    expect(turns[0].id).toBe('t1')
    expect(turns.at(-1).id).toBe(`t${MAX_CHAT_TURNS}`)
    expect(dropped).toBe(true)
  })

  it('go when the chat is cleared, which remembers when and is not a drop', async () => {
    for (let i = 0; i < MAX_CHAT_TURNS + 1; i += 1) await appendChatTurn(store, 'me', 'c1', turn(i))
    await clearChatMessages(store, 'me', 'c1', new Date('2026-10-04T09:00:00.000Z'))
    expect(await getChatMessages(store, 'me', 'c1')).toEqual({ turns: [], dropped: false, clearedAt: '2026-10-04T09:00:00.000Z' })
    await appendChatTurn(store, 'me', 'c1', turn(1))
    expect(await getChatMessages(store, 'me', 'c1')).toMatchObject({ turns: [turn(1)], clearedAt: '2026-10-04T09:00:00.000Z' })
  })

  it('go with a deleted chat, leaving every other chat as it was', async () => {
    await appendChatTurn(store, 'me', 'c1', turn(1))
    await appendChatTurn(store, 'me', 'c2', turn(2))
    await deleteChatMessages(store, 'me', 'c1')
    await deleteChatMessages(store, 'me', 'never-there')
    expect(allChatMessages(store, 'me')).toEqual({ c2: { turns: [turn(2)], dropped: false } })
  })
})
