import { describe, it, expect, vi } from 'vitest'
import { onSocketMessage } from '@jobdekho/server/apply/session-input.js'
import { parseMessage } from '@jobdekho/server/apply/ws-messages.js'

// A session as the input relay sees one, with a page that only navigates.
function session(state) {
  const page = { goBack: vi.fn(async () => null), goForward: vi.fn(async () => null), reload: vi.fn(async () => null) }
  return { state, reason: null, closing: false, active: { page, cdp: {} }, world: {}, sockets: new Set(), timers: {}, posting: { id: 'p1' }, rows: [] }
}

describe('back, forward and reload from the address bar', () => {
  it('go where the person asked', async () => {
    const s = session('yours')
    await onSocketMessage(s, { t: 'nav', go: 'back' })
    await onSocketMessage(s, { t: 'nav', go: 'forward' })
    await onSocketMessage(s, { t: 'nav', go: 'reload' })
    expect(s.active.page.goBack).toHaveBeenCalled()
    expect(s.active.page.goForward).toHaveBeenCalled()
    expect(s.active.page.reload).toHaveBeenCalled()
  })

  // A press of the person's, like any other.
  it('take the wheel from JobDekho mid-fill first', async () => {
    const s = session('filling')
    await onSocketMessage(s, { t: 'nav', go: 'reload' })
    expect(s).toMatchObject({ state: 'yours', reason: 'took-over' })
    expect(s.active.page.reload).toHaveBeenCalled()
  })

  it('ignore anything else', async () => {
    const s = session('yours')
    await onSocketMessage(s, { t: 'nav', go: 'somewhere' })
    expect(s.active.page.goBack).not.toHaveBeenCalled()
  })

  // Each half passed alone while the socket's reader dropped every press:
  // the message the panel sends (ApplyBrowserFrame.jsx) goes through the
  // reader here, the way api/apply-socket.js hands it on.
  it('arrive as the panel sends them, through the socket reader', async () => {
    const s = session('yours')
    for (const go of ['back', 'forward', 'reload']) await onSocketMessage(s, parseMessage(JSON.stringify({ t: 'nav', go })))
    expect(s.active.page.goBack).toHaveBeenCalledTimes(1)
    expect(s.active.page.goForward).toHaveBeenCalledTimes(1)
    expect(s.active.page.reload).toHaveBeenCalledTimes(1)
  })
})
