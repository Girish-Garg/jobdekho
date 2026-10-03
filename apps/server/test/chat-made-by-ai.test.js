import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from '@jobdekho/server/app.js'
import { createDashboardStore } from '@jobdekho/server/api/store.js'
import { openStore } from '@jobdekho/store/open.js'
import { upsertPostings } from '@jobdekho/store/queries.js'
import { madeByAi } from '@jobdekho/server/chat/made-by-ai.js'

const dirs = []
afterEach(() => { while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true }) })

const at = (day) => `2026-09-${String(day).padStart(2, '0')}T10:00:00.000Z`
const record = (postingId, kind, days) => ({
  kind, postingId, provider: 'claude', createdAt: at(days.at(-1)), result: {},
  versions: days.map((day) => ({ instruction: '', provider: 'claude', createdAt: at(day), result: {} })), dropped: false,
})
const doc = (id, over) => ({ id, name: id, kind: 'resume', templateId: 'classic', postingId: null, tex: 'x', createdAt: at(1), updatedAt: at(1), versions: [{ tex: 'x', at: at(1), by: 'template' }], ...over })
const change = (id, status, day) => ({ id, kind: 'profile', summary: `Change ${id}`, status, ...(status === 'applied' ? { appliedAt: at(day) } : {}) })

// One of everything the AI can make, and a few things it did not make.
async function seeded() {
  const dir = mkdtempSync(join(tmpdir(), 'jobdekho-made-'))
  dirs.push(dir)
  const store = openStore(dir)
  await upsertPostings(store, [{ id: 'j1', source: 'x', externalId: 'j1', title: 'Backend Engineer', company: 'Razorpay', url: 'u', tags: [] }])
  store.aiResults.set('u1', { 'j1:fake-check': record('j1', 'fake-check', [3, 5]), 'gone:cover-letter': record('gone', 'cover-letter', [4]) })
  store.documents.set('u1', {
    documents: [
      doc('by-hand'),
      doc('for-a-job', { postingId: 'j1', createdAt: at(6) }),
      doc('chat-changed', { versions: [{ tex: 'x', at: at(1), by: 'template' }, { tex: 'y', at: at(7), by: 'ai' }, { tex: 'z', at: at(9), by: 'you' }] }),
    ],
  })
  store.chatMessages.set('u1', {
    now: { turns: [{ question: 'q', proposals: [change('p1', 'applied', 8), change('p2', 'pending')] }], dropped: false },
    old: { turns: [{ question: 'q', proposals: [change('p3', 'applied', 2), change('p4', 'discarded')] }], dropped: false },
  })
  return store
}

describe('what the AI made', () => {
  it('lists every answer, document and applied profile change, newest first, each naming its job or chat', async () => {
    const store = await seeded()
    expect(await madeByAi({ store, documents: store, userId: 'u1' })).toEqual([
      { kind: 'profile', at: at(8), summary: 'Change p1', chatId: 'now' },
      { kind: 'document', at: at(7), documentId: 'chat-changed', name: 'chat-changed', documentKind: 'resume', postingId: null, job: null },
      { kind: 'document', at: at(6), documentId: 'for-a-job', name: 'for-a-job', documentKind: 'resume', postingId: 'j1', job: { title: 'Backend Engineer', company: 'Razorpay' } },
      { kind: 'fake-check', at: at(5), postingId: 'j1', job: { title: 'Backend Engineer', company: 'Razorpay' }, versions: 2 },
      { kind: 'cover-letter', at: at(4), postingId: 'gone', job: null, versions: 1 },
      { kind: 'profile', at: at(2), summary: 'Change p3', chatId: 'old' },
    ])
  })

  it('is empty for someone who has made nothing, and is served for the signed-in person only', async () => {
    const store = await seeded()
    expect(await madeByAi({ store, documents: store, userId: 'someone-else' })).toEqual([])
    const app = buildApp({ config: { sessionSecret: 'test-secret' }, dashboardStore: createDashboardStore(store) })
    app.decorate('chatStore', store)
    app.decorate('documentStore', store)
    await app.ready()
    const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
    const res = await app.inject({ method: 'GET', url: '/api/chat/made-by-ai', headers: { cookie } })
    expect(res.json().items.map((item) => item.kind)).toEqual(['profile', 'document', 'document', 'fake-check', 'cover-letter', 'profile'])
  })
})
