import { describe, it, expect, vi, beforeEach } from 'vitest'
import { openSession } from '@jobdekho/server/apply/session-open.js'
import { closeSession } from '@jobdekho/server/apply/session-close.js'
import { createRegistry } from '@jobdekho/server/apply/session-registry.js'

// The registry alone: starting and ending browsers is the other files' work,
// and the real thing is covered by apply-browser.test.js.
vi.mock('@jobdekho/server/apply/session-open.js', () => ({
  openSession: vi.fn(),
  startApplying: vi.fn(async () => {}),
}))
vi.mock('@jobdekho/server/apply/session-close.js', () => ({
  closeSession: vi.fn(async (s) => {
    s.closing = true
  }),
}))

const REQUEST = { posting: { id: 'p1' }, userId: 'u1', profile: {} }
let made = 0
const session = () => ({ id: `s${(made += 1)}`, closing: false, timers: {}, sockets: new Set() })
// A browser that takes a moment to start, as a real one does.
const slowly = (ms = 30) => () => new Promise((resolve) => setTimeout(() => resolve(session()), ms))

function registry(reap = vi.fn(async () => 0)) {
  return { reap, registry: createRegistry({ reap }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  openSession.mockImplementation(slowly())
})

describe('the Apply session registry', () => {
  it('starts one browser for two opens at once, and answers the second with it', async () => {
    const { registry: r } = registry()
    const [first, second] = await Promise.all([r.open(REQUEST), r.open(REQUEST)])
    expect(openSession).toHaveBeenCalledTimes(1)
    expect(second).toEqual({ conflict: first.session })
    expect(r.current()).toBe(first.session)
  })

  it('reaps what a crashed run left before the first browser only', async () => {
    const { reap, registry: r } = registry()
    const { session: s } = await r.open(REQUEST)
    await r.close(s.id)
    await r.open(REQUEST)
    expect(reap).toHaveBeenCalledTimes(1)
    expect(openSession).toHaveBeenCalledTimes(2)
  })

  it('lets the next open through after one that failed', async () => {
    openSession.mockImplementationOnce(async () => {
      throw new Error('launch failed')
    })
    const { registry: r } = registry()
    const [first, second] = await Promise.allSettled([r.open(REQUEST), r.open(REQUEST)])
    expect(first.status).toBe('rejected')
    expect(second.value.session.id).toMatch(/^s/)
  })

  it('closes a browser still starting when JobDekho shuts down', async () => {
    const { registry: r } = registry()
    const opening = r.open(REQUEST)
    await r.closeAll()
    const { session: s } = await opening
    expect(closeSession).toHaveBeenCalledWith(s)
    expect(r.current()).toBeNull()
  })
})
