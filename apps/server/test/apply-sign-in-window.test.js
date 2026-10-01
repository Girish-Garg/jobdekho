import { describe, it, expect, vi, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'
import { buildApp } from '@jobdekho/server/app.js'
import { openSignInWindow, signInWindowOpen, closeSignInWindow } from '@jobdekho/server/apply/sign-in-window.js'
import { pageSignals } from '@jobdekho/server/apply/page-signals.js'

// A browser process as the module sees one: it exits when told to.
function fakeChild() {
  const child = new EventEmitter()
  child.pid = 4242
  child.kill = vi.fn(() => child.emit('exit', 0))
  return child
}

afterEach(async () => {
  if (signInWindowOpen()) await closeSignInWindow({ platform: 'linux' })
})

describe('the normal window to sign in from', () => {
  it('starts the browser plainly on the kept profile, at the page the person was on', () => {
    const child = fakeChild()
    const launch = vi.fn(() => child)
    openSignInWindow({ executable: 'chrome.exe', profileDir: 'C:/data/apply-browser/jobdekho-apply-kept', url: 'https://internshala.com/job/1', launch })
    const [file, args] = launch.mock.calls[0]
    expect(file).toBe('chrome.exe')
    expect(args).toEqual(['--user-data-dir=C:/data/apply-browser/jobdekho-apply-kept', '--no-first-run', '--no-default-browser-check', 'https://internshala.com/job/1'])
    // Nothing that would let software drive it.
    expect(args.join(' ')).not.toMatch(/remote-debugging|enable-automation/)
    expect(signInWindowOpen()).toBe(true)
    child.emit('exit', 0)
    expect(signInWindowOpen()).toBe(false)
  })

  it('asks the window to close the way its own button would, on Windows', async () => {
    const child = fakeChild()
    openSignInWindow({ executable: 'chrome.exe', profileDir: 'p', url: 'https://x.test', launch: () => child })
    const exec = vi.fn((cmd, args) => { if (!args.includes('/F')) setTimeout(() => child.emit('exit', 0), 5) })
    await closeSignInWindow({ platform: 'win32', exec })
    expect(exec).toHaveBeenCalledWith('taskkill', ['/PID', '4242', '/T'], expect.anything(), expect.any(Function))
    expect(exec.mock.calls.some(([, args]) => args.includes('/F'))).toBe(false)
    expect(signInWindowOpen()).toBe(false)
  })
})

describe('Google refusing a driven browser', () => {
  const page = (url, text) => ({ url, text, fields: [], buttons: [], frames: [] })

  it('reads as a wall the normal window gets through', () => {
    expect(pageSignals(page('https://accounts.google.com/v3/signin/rejected', "Couldn't sign you in This browser or app may not be secure."), []).wall).toBe('google-blocked')
    expect(pageSignals(page('https://example.com/blog', "Couldn't sign you in, a story"), []).wall).toBeNull()
  })
})

describe('the sign-in window routes', () => {
  const apps = []
  afterEach(async () => {
    for (const app of apps.splice(0)) await app.close()
  })

  it('ends the application\'s browser, then opens the normal window where the person was', async () => {
    const session = { id: 's1', pageUrl: 'https://internshala.com/application/1', url: 'https://internshala.com/job/1' }
    const close = vi.fn(async () => true)
    const child = fakeChild()
    const launchPlain = vi.fn(() => child)
    const app = buildApp({ config: { sessionSecret: 'test-secret', devUserId: 'u1' }, dashboardStore: {} })
    app.decorate('applyDeps', { findBrowser: () => ({ name: 'Google Chrome', path: 'chrome.exe' }), windowMode: () => 'offscreen', keptProfile: () => 'C:/kept', launchPlain })
    app.decorate('applyRegistry', { closeAll: async () => {}, get: (id) => (id === 's1' ? session : null), close })
    await app.ready()
    apps.push(app)
    const res = await app.inject({ method: 'POST', url: '/api/apply/sessions/s1/sign-in-window' })
    expect(res.json()).toEqual({ open: true, url: 'https://internshala.com/application/1' })
    expect(close).toHaveBeenCalledWith('s1')
    expect(launchPlain.mock.calls[0][1]).toContain('--user-data-dir=C:/kept')
    expect((await app.inject({ url: '/api/apply/sign-in-window' })).json()).toEqual({ open: true })
    child.emit('exit', 0)
    expect((await app.inject({ url: '/api/apply/sign-in-window' })).json()).toEqual({ open: false })
  })
})
