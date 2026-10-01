import { describe, it, expect, afterEach } from 'vitest'
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from '@jobdekho/server/app.js'
import { keptProfileDir, PROFILE_PREFIX } from '@jobdekho/server/apply/profile-dir.js'
import { ORPHAN } from '@jobdekho/server/apply/browser-reap.js'

// Apply assist is off unless asked for (see config.js); these tests ask.
const config = { sessionSecret: 'test-secret', devUserId: 'u1', applyAssist: true }
const dirs = []
const apps = []
afterEach(async () => {
  for (const app of apps.splice(0)) await app.close()
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const dataDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'jobdekho-test-data-'))
  dirs.push(dir)
  return dir
}

describe('the profile Apply assist keeps its sign-ins in', () => {
  // A browser left over on it after a crash is still found and ended.
  it('lives in the data folder, under the name the leftover-browser sweep looks for', () => {
    const kept = keptProfileDir(dataDir())
    expect(existsSync(kept)).toBe(true)
    expect(kept).toContain(`apply-browser`)
    expect(ORPHAN.test(`chrome.exe --user-data-dir=${kept}`)).toBe(true)
    expect(kept.endsWith(`${PROFILE_PREFIX}kept`)).toBe(true)
  })
})

describe('DELETE /api/apply/sign-ins', () => {
  async function makeApp({ open = null, kept }) {
    const app = buildApp({ config, dashboardStore: {} })
    app.decorate('applyDeps', { findBrowser: () => null, windowMode: () => 'offscreen', keptProfile: () => keptProfileDir(kept) })
    app.decorate('applyRegistry', { closeAll: async () => {}, current: () => open })
    await app.ready()
    apps.push(app)
    return () => app.inject({ method: 'DELETE', url: '/api/apply/sign-ins' })
  }

  it('signs the browser out of every site by removing the profile it keeps', async () => {
    const data = dataDir()
    writeFileSync(join(keptProfileDir(data), 'Cookies'), 'session=1')
    const signOut = await makeApp({ kept: data })
    expect((await signOut()).statusCode).toBe(204)
    expect(existsSync(join(data, 'apply-browser', `${PROFILE_PREFIX}kept`, 'Cookies'))).toBe(false)
  })

  it('waits while an application is open in that browser', async () => {
    const data = dataDir()
    writeFileSync(join(keptProfileDir(data), 'Cookies'), 'session=1')
    const signOut = await makeApp({ kept: data, open: { id: 's1' } })
    const res = await signOut()
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toMatch(/Close the open application first/)
    expect(existsSync(join(data, 'apply-browser', `${PROFILE_PREFIX}kept`, 'Cookies'))).toBe(true)
  })
})
