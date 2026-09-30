import { describe, it, expect } from 'vitest'
import { findBrowser } from '@jobdekho/server/apply/browser-find.js'
import { launchFlags, forbiddenIn } from '@jobdekho/server/apply/browser-flags.js'
import { applyPreferences } from '@jobdekho/server/apply/browser-prefs.js'
import { windowModeFor, canPopOut } from '@jobdekho/server/apply/window-mode.js'
import { applyCheck } from '@jobdekho/server/setup/apply-check.js'

const only = (...paths) => (path) => paths.includes(path)

describe('findBrowser', () => {
  const env = { ProgramFiles: 'C:\\Program Files', 'ProgramFiles(x86)': 'C:\\Program Files (x86)', LOCALAPPDATA: 'C:\\Users\\a\\AppData\\Local' }

  it('prefers Chrome, then falls back to the Edge every Windows machine has', () => {
    const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    expect(findBrowser({ env, platform: 'win32', exists: only(chrome, edge) })).toEqual({ name: 'Google Chrome', path: chrome })
    expect(findBrowser({ env, platform: 'win32', exists: only(edge) })).toEqual({ name: 'Microsoft Edge', path: edge })
  })

  it('honours JOBDEKHO_APPLY_BROWSER only when the file is there', () => {
    const mine = 'D:\\Portable\\msedge.exe'
    expect(findBrowser({ env: { ...env, JOBDEKHO_APPLY_BROWSER: mine }, platform: 'win32', exists: only(mine) }).path).toBe(mine)
    expect(findBrowser({ env: { ...env, JOBDEKHO_APPLY_BROWSER: mine }, platform: 'win32', exists: () => false })).toBeNull()
  })

  it('looks in the app folders on macOS and on PATH first on Linux', () => {
    const mac = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    expect(findBrowser({ env: { HOME: '/Users/a' }, platform: 'darwin', exists: only(mac) }).name).toBe('Microsoft Edge')
    const locate = (binary) => (binary === 'chromium' ? '/usr/bin/chromium' : null)
    expect(findBrowser({ env: {}, platform: 'linux', exists: () => false, locate })).toEqual({ name: 'Chromium', path: '/usr/bin/chromium' })
  })

  it('answers null rather than downloading anything', () => {
    expect(findBrowser({ env, platform: 'win32', exists: () => false, locate: () => null })).toBeNull()
  })
})

describe('launch flags', () => {
  it('keep the sandbox, use a pipe and never a debugging port', () => {
    const flags = launchFlags({ profileDir: 'C:\\t\\p', mode: 'offscreen' })
    expect(flags).toContain('--remote-debugging-pipe')
    expect(flags).toContain('--enable-automation')
    expect(flags).toContain('--user-data-dir=C:\\t\\p')
    expect(forbiddenIn(flags)).toBeNull()
    expect(flags.some((f) => f.startsWith('--window-position='))).toBe(true)
    expect(launchFlags({ profileDir: 'x', mode: 'headless' })).toContain('--headless')
  })

  it('leave Safe Browsing on: nothing that stops its updates', () => {
    const flags = launchFlags({ profileDir: 'x', mode: 'offscreen' })
    expect(flags).not.toContain('--disable-background-networking')
    expect(flags).not.toContain('--disable-component-update')
  })

  it('catch what a library or wrapper may add', () => {
    expect(forbiddenIn(['msedge.exe', '--no-sandbox'])).toBe('--no-sandbox')
    expect(forbiddenIn(['--disable-popup-blocking'])).toBe('--disable-popup-blocking')
    expect(forbiddenIn(['--remote-debugging-port=9222'])).toBe('--remote-debugging-port=9222')
    expect(forbiddenIn(['--disable-features=Translate,IsolateSandboxedIframes'])).toMatch(/IsolateSandboxedIframes/)
    expect(forbiddenIn(['--disable-features=ThirdPartyStoragePartitioning'])).not.toBeNull()
    expect(forbiddenIn(['--disable-features=Translate,MediaRouter'])).toBeNull()
  })

  it('write a profile that saves no password, autofills nothing and blocks third-party cookies', () => {
    const prefs = applyPreferences('/p/downloads')
    expect(prefs.credentials_enable_service).toBe(false)
    expect(prefs.profile.password_manager_enabled).toBe(false)
    expect(prefs.autofill.enabled).toBe(false)
    expect(prefs.profile.cookie_controls_mode).toBe(1)
    expect(prefs.safebrowsing.enabled).toBe(true)
  })
})

describe('window mode', () => {
  it('hides a real window where it can, and runs headless only where it must', () => {
    expect(windowModeFor('win32', {})).toBe('offscreen')
    expect(windowModeFor('darwin', {})).toBe('minimized')
    expect(windowModeFor('linux', { DISPLAY: ':0' })).toBe('offscreen')
    expect(windowModeFor('linux', { DISPLAY: ':0', WAYLAND_DISPLAY: 'wayland-0' })).toBe('headless')
    expect(windowModeFor('linux', {})).toBe('headless')
    expect(canPopOut('headless')).toBe(false)
    expect(canPopOut('offscreen')).toBe(true)
  })
})

describe('applyCheck', () => {
  it('is optional without a browser, ok with one, and absent when nobody looked', () => {
    expect(applyCheck(null).state).toBe('optional')
    expect(applyCheck(null).fix).toMatch(/Install Google Chrome/)
    expect(applyCheck({ name: 'Microsoft Edge', path: 'x' })).toMatchObject({ id: 'apply', state: 'ok', fix: null })
    expect(applyCheck(undefined)).toBeNull()
  })
})
