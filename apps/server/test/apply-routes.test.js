import { describe, it, expect, vi, afterEach } from 'vitest'
import { request as httpRequest } from 'node:http'
import { buildApp } from '@jobdekho/server/app.js'

const config = { sessionSecret: 'test-secret', devUserId: 'u1' }
const POSTING = { id: 'p1', source: 'lever:cred', externalId: 'abc', title: 'SRE', company: 'CRED', url: 'https://jobs.lever.co/cred/abc' }
const BOARD = { ...POSTING, id: 'p2', source: 'linkedin', url: 'https://in.linkedin.com/jobs/view/1' }
const PROFILE = { basics: { name: 'Demo Candidate', email: 'demo@example.com', phone: '+91 90000 00000', location: 'Pune, India', links: {} } }

// A session as the registry would hold one, with a browser made of fakes.
function fakeSession(over = {}) {
  return {
    id: 's1', token: 't'.repeat(64), posting: POSTING, state: 'yours', reason: 'check-page', pageUrl: POSTING.url, title: 'Apply',
    rows: [], submit: null, browserName: 'Microsoft Edge', mode: 'offscreen', shown: false, fileInfo: null, picker: null, chooser: null,
    dialog: null, values: {}, sockets: new Set(), timers: {}, frame: null, seq: 0, size: { w: 1280, h: 860 }, closing: false,
    active: { cdp: { send: vi.fn(async () => ({})) }, page: {} }, world: { call: vi.fn(async () => null) }, ...over,
  }
}

const apps = []
afterEach(async () => {
  for (const app of apps.splice(0)) await app.close()
})

async function makeApp({ registry, found = { name: 'Microsoft Edge', path: 'x' } } = {}) {
  const dashboard = {
    getPosting: vi.fn(async (_u, id) => ({ p1: POSTING, p2: BOARD })[id] ?? null),
    getProfile: vi.fn(async () => PROFILE),
    getAiResult: vi.fn(async () => ({ result: { letter: 'Dear Hiring Team at CRED,' } })),
  }
  const app = buildApp({ config, dashboardStore: dashboard })
  app.decorate('applyDeps', { findBrowser: () => found, windowMode: () => 'offscreen' })
  app.decorate('applyRegistry', { closeAll: async () => {}, ...registry })
  await app.ready()
  apps.push(app)
  return app
}

const post = (app, url, body) => app.inject({ method: 'POST', url, payload: body })

describe('Apply assist routes', () => {
  it('says which browser it would use, and never offers job boards', async () => {
    const app = await makeApp({ registry: { open: vi.fn() } })
    expect((await app.inject({ url: '/api/apply/browser' })).json()).toEqual({ browser: { name: 'Microsoft Edge' }, canPopOut: true })
    const res = await post(app, '/api/apply/sessions', { postingId: 'p2' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/job board you are signed in to/)
    expect((await post(app, '/api/apply/sessions', { postingId: 'nope' })).statusCode).toBe(404)
  })

  it('opens one session and hands the token only to this answer', async () => {
    const s = fakeSession()
    const registry = { open: vi.fn(async () => ({ session: s })), current: () => s, get: () => s, close: vi.fn(async () => true) }
    const app = await makeApp({ registry })
    const res = await post(app, '/api/apply/sessions', { postingId: 'p1' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ token: s.token, session: { id: 's1', state: 'yours', browser: 'Microsoft Edge', canPopOut: true } })
    expect(registry.open).toHaveBeenCalledWith({ posting: POSTING, userId: 'u1', profile: PROFILE })
    expect((await app.inject({ url: '/api/apply/sessions/current' })).json().session.id).toBe('s1')
    expect((await app.inject({ method: 'DELETE', url: '/api/apply/sessions/s1' })).statusCode).toBe(204)
    expect(registry.close).toHaveBeenCalledWith('s1')
  })

  it('answers a second open with the one already open, and a missing browser plainly', async () => {
    const open = fakeSession()
    const app = await makeApp({ registry: { open: vi.fn(async () => ({ conflict: open })) } })
    const res = await post(app, '/api/apply/sessions', { postingId: 'p1' })
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toMatch(/already open: SRE at CRED/)
    const failing = { open: vi.fn(async () => { throw Object.assign(new Error('Apply assist needs Google Chrome or Microsoft Edge on this computer.'), { code: 'no-browser' }) }) }
    const none = await post(await makeApp({ registry: failing }), '/api/apply/sessions', { postingId: 'p1' })
    expect(none.statusCode).toBe(400)
    expect(none.json()).toMatchObject({ kind: 'no-browser' })
  })

  it('takes the wheel on request and fills only when asked', async () => {
    const s = fakeSession({ state: 'filling', reason: null })
    const app = await makeApp({ registry: { get: (id) => (id === 's1' ? s : null) } })
    const res = await post(app, '/api/apply/sessions/s1/takeover', {})
    expect(res.json().session).toMatchObject({ state: 'yours', reason: 'took-over' })
    expect((await post(app, '/api/apply/sessions/gone/fill', {})).statusCode).toBe(404)
  })

  it('gives the copy panel every value and the saved letter, with no browser at all', async () => {
    const app = await makeApp({ registry: {}, found: null })
    const body = (await app.inject({ url: '/api/apply/copy/p1' })).json()
    expect(body.rows).toContainEqual({ label: 'Email', value: 'demo@example.com' })
    expect(body.rows).toContainEqual({ label: 'Phone', value: '+91 90000 00000' })
    expect(body.coverLetter).toBe('Dear Hiring Team at CRED,')
  })
})

describe('the live view socket', () => {
  async function listening(s) {
    const app = await makeApp({ registry: { get: (id) => (id === s.id ? s : null) } })
    const address = await app.listen({ port: 0, host: '127.0.0.1' })
    return address.replace('http', 'ws')
  }
  const opened = (ws) => new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  const closed = (ws) => new Promise((resolve) => { ws.onclose = (event) => resolve(event.code) })
  const firstMessage = (ws) => new Promise((resolve) => { ws.onmessage = (event) => resolve(JSON.parse(event.data)) })

  it('sends nothing and takes nothing until the token arrives', async () => {
    const s = fakeSession()
    const ws = new WebSocket(`${await listening(s)}/api/apply/sessions/s1/socket`)
    await opened(ws)
    const code = closed(ws)
    ws.send(JSON.stringify({ t: 'hello', token: 'wrong' }))
    expect(await code).toBe(4001)
    expect(s.sockets.size).toBe(0)
  })

  it('shows the session and relays the person\'s text, any script', async () => {
    const s = fakeSession()
    const ws = new WebSocket(`${await listening(s)}/api/apply/sessions/s1/socket`)
    await opened(ws)
    const view = firstMessage(ws)
    ws.send(JSON.stringify({ t: 'hello', token: s.token }))
    expect((await view).view).toMatchObject({ id: 's1', state: 'yours' })
    ws.send(JSON.stringify({ t: 'text', text: 'नमस्ते 😀' }))
    await vi.waitFor(() => expect(s.active.cdp.send).toHaveBeenCalledWith('Input.insertText', { text: 'नमस्ते 😀' }))
    ws.close()
  })

  it('keeps the person\'s input in order, even when a press waits on the page', async () => {
    // The press asks the page what is under it first; slowly, here.
    const s = fakeSession({ world: { call: vi.fn(() => new Promise((resolve) => setTimeout(() => resolve(null), 120))) } })
    const ws = new WebSocket(`${await listening(s)}/api/apply/sessions/s1/socket`)
    await opened(ws)
    const view = firstMessage(ws)
    ws.send(JSON.stringify({ t: 'hello', token: s.token }))
    await view
    ws.send(JSON.stringify({ t: 'down', x: 10, y: 10, button: 'left', clicks: 1 }))
    ws.send(JSON.stringify({ t: 'up', x: 10, y: 10, button: 'left', clicks: 1 }))
    await vi.waitFor(() => expect(s.active.cdp.send).toHaveBeenCalledTimes(2))
    expect(s.active.cdp.send.mock.calls.map(([, params]) => params.type)).toEqual(['mousePressed', 'mouseReleased'])
    ws.close()
  })

  it('is refused to a page from another site before any upgrade', async () => {
    const url = new URL(await listening(fakeSession()))
    const status = await new Promise((resolve) => {
      const req = httpRequest({
        host: url.hostname, port: url.port, path: '/api/apply/sessions/s1/socket',
        headers: { Connection: 'Upgrade', Upgrade: 'websocket', Origin: 'https://evil.example', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==' },
      })
      // A browser drops the connection after a refused handshake; so does this.
      req.on('response', (res) => {
        resolve(res.statusCode)
        req.destroy()
      })
      req.on('upgrade', (_res, socket) => {
        resolve(101)
        socket.destroy()
      })
      req.end()
    })
    expect(status).toBe(403)
  })
})
