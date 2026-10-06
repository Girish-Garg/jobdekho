import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from '@jobdekho/server/app.js'
import { createDashboardStore } from '@jobdekho/server/api/store.js'
import { openStore } from '@jobdekho/store/open.js'
import { MAX_MEMORIES } from '@jobdekho/store/memory.js'

const dirs = []
afterEach(() => { while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true }) })

// One real store in a temporary folder behind the chat's handle, the one
// the memory routes use.
async function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'jobdekho-memory-routes-'))
  dirs.push(dir)
  const store = openStore(dir)
  const app = buildApp({ config: { sessionSecret: 'test-secret' }, dashboardStore: createDashboardStore(store) })
  app.decorate('chatStore', store)
  app.decorate('documentStore', store)
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
  const call = (method, url, body) => app.inject({
    method, url, headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { payload: JSON.stringify(body) } : {}),
  })
  const list = async () => (await call('GET', '/api/memory')).json()
  return { app, store, call, list }
}

describe('the memory routes', () => {
  it('need the session cookie', async () => {
    const { app } = await setup()
    expect((await app.inject({ method: 'GET', url: '/api/memory' })).statusCode).toBe(401)
    expect((await app.inject({ method: 'DELETE', url: '/api/memory' })).statusCode).toBe(401)
  })

  it('reads as switched on with nothing saved', async () => {
    const { list } = await setup()
    expect(await list()).toEqual({ enabled: true, items: [], archived: 0 })
  })

  it('saves a suggestion or a line written by hand, and the same words again answer with the one kept', async () => {
    const { call, list } = await setup()
    const first = await call('POST', '/api/memory', { text: 'Keep my resume to one page', scope: 'resume', quote: 'keep my resume to one page' })
    expect(first.statusCode).toBe(201)
    expect(first.json()).toEqual({ item: expect.objectContaining({ text: 'Keep my resume to one page', scope: 'resume', quote: 'keep my resume to one page' }), replaced: null })
    const again = await call('POST', '/api/memory', { text: 'keep my resume to one page.', scope: 'resume' })
    expect(again.statusCode).toBe(200)
    expect(again.json().item.id).toBe(first.json().item.id)
    const byHand = await call('POST', '/api/memory', { text: 'Use Indian English' })
    expect(byHand.json().item).toMatchObject({ scope: 'everywhere', quote: null })
    expect((await list()).items.map((item) => item.text)).toEqual(['Keep my resume to one page', 'Use Indian English'])
  })

  it('archives what a save replaces, and an Undo deletes the new one and restores the old', async () => {
    const { call, list } = await setup()
    const old = (await call('POST', '/api/memory', { text: 'Only remote roles', scope: 'jobs' })).json().item
    const saved = await call('POST', '/api/memory', { text: 'Remote or hybrid roles', scope: 'jobs', replaces: old.id })
    expect(saved.json().replaced).toEqual({ id: old.id, text: 'Only remote roles' })
    expect(await list()).toMatchObject({ items: [{ text: 'Remote or hybrid roles', replaces: old.id }], archived: 1 })
    expect((await call('DELETE', `/api/memory/${saved.json().item.id}`)).statusCode).toBe(204)
    const restored = await call('PATCH', `/api/memory/${old.id}`, { restore: true })
    expect(restored.json().item).toMatchObject({ id: old.id, archived: false })
    expect((await list()).items.map((item) => item.text)).toEqual(['Only remote roles'])
  })

  it('says in the person\'s words what is wrong with a line', async () => {
    const { call } = await setup()
    const refusal = async (body) => {
      const res = await call('POST', '/api/memory', body)
      return [res.statusCode, res.json().error]
    }
    expect(await refusal({ text: '  ' })).toEqual([400, 'Write what the AI should remember first.'])
    expect(await refusal({ text: 'x'.repeat(201) })).toEqual([400, 'Keep it to 200 characters or fewer.'])
    expect(await refusal({ text: 'Be brief', scope: 'mood' })).toEqual([400, 'Choose where it applies: everywhere, jobs, resume or cover letters.'])
  })

  it('refuses a save past 150 kept', async () => {
    const { call, store } = await setup()
    store.memory.set('u1', { enabled: true, items: Array.from({ length: MAX_MEMORIES }, (_, i) => ({ id: `id${i}`, text: `Preference ${i}`, scope: 'jobs' })) })
    const res = await call('POST', '/api/memory', { text: 'One more' })
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toBe('You have 150 things saved, the most JobDekho keeps. Delete one first.')
  })

  it('changes the text or the scope of one item, and refuses a copy, a missing one or nothing to change', async () => {
    const { call } = await setup()
    const one = (await call('POST', '/api/memory', { text: 'Be brief' })).json().item
    await call('POST', '/api/memory', { text: 'Use Indian English' })
    const edited = await call('PATCH', `/api/memory/${one.id}`, { text: 'Keep letters short', scope: 'letters' })
    expect(edited.statusCode).toBe(200)
    expect(edited.json().item).toMatchObject({ id: one.id, text: 'Keep letters short', scope: 'letters' })
    const copy = await call('PATCH', `/api/memory/${one.id}`, { text: 'use indian english' })
    expect([copy.statusCode, copy.json().error]).toEqual([409, 'You already have that one saved.'])
    expect((await call('PATCH', '/api/memory/nope', { text: 'x' })).statusCode).toBe(404)
    expect((await call('PATCH', `/api/memory/${one.id}`, {})).statusCode).toBe(400)
  })

  it('deletes one item, and says when it is already gone', async () => {
    const { call, list } = await setup()
    const one = (await call('POST', '/api/memory', { text: 'Be brief' })).json().item
    expect((await call('DELETE', `/api/memory/${one.id}`)).statusCode).toBe(204)
    const again = await call('DELETE', `/api/memory/${one.id}`)
    expect([again.statusCode, again.json().error]).toEqual([404, 'That one is no longer saved.'])
    expect((await list()).items).toEqual([])
  })

  it('forgets everything, archived items too, and keeps the switch where it was', async () => {
    const { call, list } = await setup()
    const old = (await call('POST', '/api/memory', { text: 'Only remote roles' })).json().item
    await call('POST', '/api/memory', { text: 'Hybrid is fine', replaces: old.id })
    expect((await call('PUT', '/api/memory/settings', { enabled: false })).json()).toEqual({ enabled: false })
    expect((await call('DELETE', '/api/memory')).statusCode).toBe(204)
    expect(await list()).toEqual({ enabled: false, items: [], archived: 0 })
  })

  it('turns memory on and off, and takes nothing but a yes or no', async () => {
    const { call, list } = await setup()
    expect((await call('PUT', '/api/memory/settings', { enabled: false })).json()).toEqual({ enabled: false })
    expect((await list()).enabled).toBe(false)
    expect((await call('PUT', '/api/memory/settings', { enabled: true })).json()).toEqual({ enabled: true })
    expect((await call('PUT', '/api/memory/settings', { enabled: 'maybe' })).statusCode).toBe(400)
    expect((await call('PUT', '/api/memory/settings', {})).statusCode).toBe(400)
  })

  // What became of each offer, for the habit spotter's cooldown and a
  // classifier later (see packages/store/src/memory-feedback.js).
  it('notes a chip saved as offered, saved after an edit, or put off with Not now', async () => {
    const { store, call } = await setup()
    const offer = { source: 'habit', topic: 'pay', offered: 'Always tell me the pay when we talk about a job' }
    expect((await call('POST', '/api/memory', { text: offer.offered, scope: 'jobs', ...offer })).statusCode).toBe(201)
    expect((await call('POST', '/api/memory', { text: 'Tell me the stipend too', scope: 'jobs', ...offer, topic: 'pay' })).statusCode).toBe(201)
    expect((await call('POST', '/api/memory/feedback', { text: 'Tell me the interview process', source: 'habit', topic: 'interview' })).statusCode).toBe(204)
    expect((await call('POST', '/api/memory', { text: 'Written by hand' })).statusCode).toBe(201)
    const log = store.memoryFeedback.get('u1')
    expect(log.map((entry) => [entry.topic, entry.outcome])).toEqual([['pay', 'saved'], ['pay', 'edited'], ['interview', 'dismissed']])
    expect(log[1].text).toBe(offer.offered)
    expect((await call('POST', '/api/memory/feedback', {})).statusCode).toBe(400)
    await call('DELETE', '/api/memory')
    expect(store.memoryFeedback.get('u1')).toEqual([])
  })
})
