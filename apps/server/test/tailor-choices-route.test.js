import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'
import { memoryChatStore } from './fixtures/chat-store.js'

const config = { googleClientId: 'id', googleClientSecret: 'sec', sessionSecret: 'test-secret', baseUrl: 'http://localhost:3000' }

const PLAN = {
  sections: { experience: [{ id: 'e1', bullets: ['Reworded.'], was: [['Mine.']], dropped: ['Dropped.'] }] },
  leftOut: { skills: ['Kotlin'], projects: [{ id: 'p9', title: 'Expense Tracker' }], fill: [] },
  keywords: { used: [], missing: [] },
}
const SAVED = { kind: 'resume-tailor', postingId: 'p1', provider: 'claude', createdAt: '2026-10-13T00:00:00.000Z', result: PLAN }

function makeStore(saved = SAVED) {
  return {
    getAiResult: vi.fn().mockResolvedValue(saved),
    replaceAiResult: vi.fn(async (_userId, { result }) => ({ ...saved, result })),
  }
}

async function put(store, body) {
  const app = buildApp({ config, userStore: { upsertUser: vi.fn(), getUserById: vi.fn() }, fetchProfile: vi.fn(), dashboardStore: store })
  app.decorate('chatStore', memoryChatStore())
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
  return app.inject({
    method: 'PUT', url: '/api/postings/p1/ai/resume-tailor/choices',
    payload: JSON.stringify(body), headers: { cookie, 'content-type': 'application/json' },
  })
}

describe('PUT /api/postings/:id/ai/resume-tailor/choices', () => {
  it('saves what the person put back on the newest plan, in place, and answers with the record', async () => {
    const store = makeStore()
    const res = await put(store, { skills: ['kotlin'], projects: ['p9'], mine: { e1: [0] }, back: { e1: [0] } })
    expect(res.statusCode).toBe(200)
    const choices = { skills: ['Kotlin'], projects: ['p9'], mine: { e1: [0] }, back: { e1: [0] } }
    expect(store.getAiResult).toHaveBeenCalledWith('u1', 'p1', 'resume-tailor')
    expect(store.replaceAiResult).toHaveBeenCalledWith('u1', { postingId: 'p1', kind: 'resume-tailor', result: { ...PLAN, choices } })
    expect(res.json().result.choices).toEqual(choices)
    expect(res.json().createdAt).toBe(SAVED.createdAt)
  })

  it('keeps nothing the plan cannot vouch for', async () => {
    const store = makeStore()
    const res = await put(store, { skills: ['Rust'], projects: ['ghost'], mine: { e1: [4], constructor: [0] }, back: { nope: [0] } })
    expect(res.json().result.choices).toEqual({ skills: [], projects: [], mine: {}, back: {} })
  })

  it('is a 404 with words to show when no plan was made for this job', async () => {
    const store = makeStore(null)
    const res = await put(store, { skills: ['Kotlin'] })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'Tailor your resume for this job first.' })
    expect(store.replaceAiResult).not.toHaveBeenCalled()
  })
})
