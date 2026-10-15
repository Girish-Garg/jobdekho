import { describe, it, expect, afterEach } from 'vitest'
import { chatApp, posting, cleanUp } from './fixtures/chat-app.js'

afterEach(cleanUp)

const setup = (opts = {}) => chatApp({ postings: [posting('p1', 'Frontend developer', 'Globex'), posting('p2', 'SDE intern', 'Initech')], ...opts })

describe('the Tracker', () => {
  it('starts from the postings already marked Applied', async () => {
    const app = await setup({ seed: (store, userId) => store.statuses.set(userId, { p1: 'applied', p2: 'saved' }) })
    const res = await app.call('GET', '/api/tracker')
    expect(res.statusCode).toBe(200)
    expect(res.json().stages).toContain('interview')
    expect(res.json().entries).toEqual([expect.objectContaining({ company: 'Globex', role: 'Frontend developer', postingId: 'p1', stage: 'applied', stageAt: null })])
  })

  it('tracks a posting the moment it is marked Applied, once', async () => {
    const app = await setup()
    await app.call('PATCH', '/api/postings/p2', { status: 'applied' })
    await app.call('PATCH', '/api/postings/p2', { status: null })
    await app.call('PATCH', '/api/postings/p2', { status: 'applied' })
    const { entries } = (await app.call('GET', '/api/tracker')).json()
    expect(entries).toEqual([expect.objectContaining({ company: 'Initech', postingId: 'p2', stage: 'applied' })])
  })

  it('adds one by hand, moves it, and removes it', async () => {
    const app = await setup()
    const added = await app.call('POST', '/api/tracker', { company: 'Northwind', role: 'SDE intern', stage: 'assessment', note: 'Due 17 Oct' })
    expect(added.statusCode).toBe(200)
    const { entry } = added.json()
    const moved = await app.call('PATCH', `/api/tracker/${entry.id}`, { stage: 'interview', note: 'Round 1 Friday' })
    expect(moved.json().entry).toMatchObject({ stage: 'interview' })
    expect(moved.json().entry.events.at(-1)).toMatchObject({ stage: 'interview', text: 'Round 1 Friday' })
    expect((await app.call('DELETE', `/api/tracker/${entry.id}`)).statusCode).toBe(204)
    expect((await app.call('DELETE', `/api/tracker/${entry.id}`)).statusCode).toBe(404)
  })

  it('says what is wrong with an entry in a sentence', async () => {
    const app = await setup()
    expect((await app.call('POST', '/api/tracker', { company: ' ' })).json().error).toBe('Type the company first.')
    expect((await app.call('POST', '/api/tracker', { company: 'X', stage: 'hired' })).statusCode).toBe(400)
    expect((await app.call('PATCH', '/api/tracker/nope', { stage: 'offer' })).json().error).toBe('That entry is no longer in your Tracker.')
  })
})
