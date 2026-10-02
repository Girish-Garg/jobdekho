import { describe, it, expect, vi, afterEach } from 'vitest'
import { createServer } from 'node:net'
import { dataHome } from '@jobdekho/server/cli/data-home.js'
import { freePort } from '@jobdekho/server/cli/free-port.js'
import { openCommand, openBrowser } from '@jobdekho/server/cli/open-browser.js'

// Each system's place for an app's own files, outside npx's cache, so a new
// version finds the old one's data.
describe('where the command keeps data by default', () => {
  it('is the user data folder each system keeps for apps', () => {
    expect(dataHome({ platform: 'win32', env: { APPDATA: 'C:\\Users\\a\\AppData\\Roaming' }, home: 'C:\\Users\\a' }))
      .toBe('C:\\Users\\a\\AppData\\Roaming\\JobDekho')
    expect(dataHome({ platform: 'win32', env: {}, home: 'C:\\Users\\a' })).toBe('C:\\Users\\a\\AppData\\Roaming\\JobDekho')
    expect(dataHome({ platform: 'darwin', env: {}, home: '/Users/a' })).toBe('/Users/a/Library/Application Support/JobDekho')
    expect(dataHome({ platform: 'linux', env: {}, home: '/home/a' })).toBe('/home/a/.local/share/jobdekho')
    expect(dataHome({ platform: 'linux', env: { XDG_DATA_HOME: '/data' }, home: '/home/a' })).toBe('/data/jobdekho')
  })
})

describe('the port the command serves on', () => {
  const held = []
  afterEach(async () => {
    for (const server of held.splice(0)) await new Promise((done) => server.close(done))
  })
  const hold = (port) => new Promise((resolve) => {
    const server = createServer().listen({ port, host: '127.0.0.1' }, () => resolve(server.address().port))
    held.push(server)
  })

  it('is the one asked for when free, and the next free one when not', async () => {
    const taken = await hold(0)
    expect(await freePort(taken)).toBeGreaterThan(taken)
    const after = await freePort(taken + 1)
    expect(await freePort(after)).toBe(after)
  })

  it('gives up after the ports it was allowed to try', async () => {
    const taken = await hold(0)
    expect(await freePort(taken, { tries: 1 })).toBeNull()
  })
})

describe('opening the browser', () => {
  it('uses each system\'s own opener, escaping what cmd would read', () => {
    expect(openCommand('http://localhost:4747/?a=1&b=2', 'win32'))
      .toEqual({ file: 'cmd', args: ['/c', 'start', '""', 'http://localhost:4747/?a=1^&b=2'], verbatim: true })
    expect(openCommand('http://localhost:4747', 'darwin')).toEqual({ file: 'open', args: ['http://localhost:4747'], verbatim: false })
    expect(openCommand('http://localhost:4747', 'linux')).toEqual({ file: 'xdg-open', args: ['http://localhost:4747'], verbatim: false })
  })

  it('never stops the command when there is no browser to open', () => {
    const child = { on: vi.fn(), unref: vi.fn() }
    const run = vi.fn(() => child)
    openBrowser('http://localhost:4747', { platform: 'linux', run })
    expect(run).toHaveBeenCalledWith('xdg-open', ['http://localhost:4747'], expect.objectContaining({ detached: true }))
    expect(child.on).toHaveBeenCalledWith('error', expect.any(Function))
    expect(() => openBrowser('x', { platform: 'linux', run: () => { throw new Error('ENOENT') } })).not.toThrow()
  })
})
