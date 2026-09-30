import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
import { appendChatTurn, getChatHistory } from '@jobdekho/store/chat-history.js'
import { findProposal, updateProposal } from '@jobdekho/store/chat-proposals.js'
import { fileAwayConversation } from '@jobdekho/store/chat-switch.js'
import { getConversation } from '@jobdekho/store/chat-archive.js'

let dir
let store
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-proposals-')); store = openStore(dir) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const proposal = (id) => ({ id, kind: 'profile', summary: 'Add a project', status: 'pending', ops: [], diff: [] })
const turn = (id, proposals) => ({ id, question: 'Q', answer: 'A', provider: 'claude', ...(proposals ? { proposals } : {}) })

describe('chat proposals', () => {
  it('finds a proposal by id among the saved turns, with the turn that offered it', async () => {
    await appendChatTurn(store, 'me', turn('t0'))
    await appendChatTurn(store, 'me', turn('t1', [proposal('a'), proposal('b')]))
    const found = await findProposal(store, 'me', 'b')
    expect(found.turn.id).toBe('t1')
    expect(found.proposal.id).toBe('b')
    expect(await findProposal(store, 'me', 'zzz')).toBeNull()
    expect(await findProposal(store, 'someone-else', 'b')).toBeNull()
  })

  it('marks one proposal and saves, leaving every other turn and proposal as it was', async () => {
    await appendChatTurn(store, 'me', turn('t0'))
    await appendChatTurn(store, 'me', turn('t1', [proposal('a'), proposal('b')]))
    const updated = await updateProposal(store, 'me', 'a', { status: 'applied', appliedAt: 'now' })
    expect(updated).toMatchObject({ id: 'a', status: 'applied', appliedAt: 'now' })
    const turns = await getChatHistory(store, 'me')
    expect(turns[0]).toEqual(turn('t0'))
    expect(turns[1].proposals.map((p) => p.status)).toEqual(['applied', 'pending'])
  })

  it('answers null and writes nothing for a proposal no turn holds', async () => {
    await appendChatTurn(store, 'me', turn('t1', [proposal('a')]))
    expect(await updateProposal(store, 'me', 'gone', { status: 'discarded' })).toBeNull()
    expect((await getChatHistory(store, 'me'))[0].proposals[0].status).toBe('pending')
  })

  // Filing a conversation away is not turning its offers down.
  it('finds and marks a proposal in a conversation filed away, leaving the current one alone', async () => {
    await appendChatTurn(store, 'me', turn('t1', [proposal('a')]))
    const { filed } = await fileAwayConversation(store, 'me')
    await appendChatTurn(store, 'me', turn('t2', [proposal('b')]))
    expect(await findProposal(store, 'me', 'a')).toMatchObject({ conversationId: filed.id, proposal: { id: 'a' } })
    expect(await updateProposal(store, 'me', 'a', { status: 'applied' })).toMatchObject({ id: 'a', status: 'applied' })
    expect((await getConversation(store, 'me', filed.id)).turns[0].proposals[0].status).toBe('applied')
    expect((await getChatHistory(store, 'me'))[0].proposals[0].status).toBe('pending')
  })
})
