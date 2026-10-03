import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
import { appendChatTurn, getChatMessages, clearChatMessages } from '@jobdekho/store/chat-messages.js'
import { findProposal, updateProposal } from '@jobdekho/store/chat-proposals.js'

let dir
let store
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-proposals-')); store = openStore(dir) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const proposal = (id) => ({ id, kind: 'profile', summary: 'Add a project', status: 'pending', ops: [], diff: [] })
const turn = (id, proposals) => ({ id, question: 'Q', answer: 'A', provider: 'claude', items: { jobs: [], documents: [] }, ...(proposals ? { proposals } : {}) })

describe('chat proposals', () => {
  it('finds a proposal by id in whichever chat offered it, with the turn and the chat', async () => {
    await appendChatTurn(store, 'me', 'c1', turn('t0'))
    await appendChatTurn(store, 'me', 'c2', turn('t1', [proposal('a'), proposal('b')]))
    const found = await findProposal(store, 'me', 'b')
    expect(found).toMatchObject({ chatId: 'c2', turn: { id: 't1' }, proposal: { id: 'b' } })
    expect(await findProposal(store, 'me', 'zzz')).toBeNull()
    expect(await findProposal(store, 'someone-else', 'b')).toBeNull()
  })

  it('marks one proposal and saves its chat, leaving every other turn, proposal and chat as it was', async () => {
    await appendChatTurn(store, 'me', 'c1', turn('t0', [proposal('x')]))
    await appendChatTurn(store, 'me', 'c2', turn('t1'))
    await appendChatTurn(store, 'me', 'c2', turn('t2', [proposal('a'), proposal('b')]))
    const updated = await updateProposal(store, 'me', 'a', { status: 'applied', appliedAt: 'now' })
    expect(updated).toMatchObject({ id: 'a', status: 'applied', appliedAt: 'now' })
    const { turns } = await getChatMessages(store, 'me', 'c2')
    expect(turns[0]).toEqual(turn('t1'))
    expect(turns[1].proposals.map((p) => p.status)).toEqual(['applied', 'pending'])
    expect((await getChatMessages(store, 'me', 'c1')).turns[0].proposals[0].status).toBe('pending')
  })

  it('answers null and writes nothing for a proposal no chat holds, including one in a cleared chat', async () => {
    await appendChatTurn(store, 'me', 'c1', turn('t1', [proposal('a')]))
    await clearChatMessages(store, 'me', 'c1')
    expect(await updateProposal(store, 'me', 'a', { status: 'discarded' })).toBeNull()
    expect(await findProposal(store, 'me', 'a')).toBeNull()
  })
})
