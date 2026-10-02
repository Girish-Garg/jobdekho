import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'
import { main } from '@jobdekho/server/cli/main.js'
import { freePort } from '@jobdekho/server/cli/free-port.js'
import { openStore } from '@jobdekho/store/open.js'
// Loaded here, not first inside a test: the command imports the server only
// once it has checked Node, and compiling it for the first time can take the
// test runner longer than a test's own time limit.
import '@jobdekho/server/start.js'

const SERVER_TEST_MS = 20000

const KEYS = ['JOBDEKHO_DATA_DIR', 'PORT', 'HOST', 'NODE_ENV']
let dir
let saved
let log
let error
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'jobdekho-cli-'))
  // A refresh never runs from a test, even if a timer outlives it.
  openStore(dir).scrapeSettings.set('local', { autoRefresh: false })
  saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]))
  log = vi.spyOn(console, 'log').mockImplementation(() => {})
  error = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  process.exitCode = undefined
  vi.restoreAllMocks()
  rmSync(dir, { recursive: true, force: true })
})

describe('the jobdekho command', () => {
  // A shell set up for other work can carry these; none of them may put the
  // person's data on the network or switch the one local person off.
  it('serves this computer alone from the folder named, whatever the shell carries', async () => {
    Object.assign(process.env, { HOST: '0.0.0.0', NODE_ENV: 'production', PORT: '1' })
    const port = await freePort(47470)
    const open = vi.fn()
    const app = await main(['--data', dir, '--port', String(port)], { version: '9.9.9', open })
    try {
      expect(app.server.address()).toMatchObject({ address: '127.0.0.1', port })
      const res = await fetch(`http://127.0.0.1:${port}/api/scrape/settings`)
      expect(res.status).toBe(200)
      expect(open).toHaveBeenCalledWith(`http://localhost:${port}`)
      expect(log.mock.calls.join('\n')).toMatch(new RegExp(`JobDekho 9.9.9 is running at http://localhost:${port}[\\s\\S]*Your data: .*jobdekho-cli-`))
    } finally {
      await app.close()
    }
  }, SERVER_TEST_MS)

  it('leaves the browser alone when asked, and makes the data folder it was given', async () => {
    const data = join(dir, 'new', 'place')
    const open = vi.fn()
    const app = await main(['--data', data, '--port', String(await freePort(47490)), '--no-open'], { open })
    await app.close()
    expect(open).not.toHaveBeenCalled()
    expect(existsSync(data)).toBe(true)
  }, SERVER_TEST_MS)

  it('says so plainly when the port it was told to use is taken', async () => {
    const server = await new Promise((resolve) => {
      const s = createServer().listen({ port: 0, host: '127.0.0.1' }, () => resolve(s))
    })
    const port = server.address().port
    expect(await main(['--data', dir, '--port', String(port)], { open: vi.fn() })).toBeUndefined()
    await new Promise((done) => server.close(done))
    expect(error).toHaveBeenCalledWith(expect.stringMatching(`Port ${port} is already in use`))
    expect(process.exitCode).toBe(1)
  }, SERVER_TEST_MS)

  it('prints help, the version, or what was wrong, and starts nothing', async () => {
    expect(await main(['--version'], { version: '1.2.3' })).toBeUndefined()
    expect(log).toHaveBeenCalledWith('1.2.3')
    await main(['--help'])
    expect(log.mock.calls.at(-1)[0]).toMatch(/^Usage: npx jobdekho@latest/)
    await main(['--bogus'])
    expect(error.mock.calls.at(-1)[0]).toMatch(/^Unknown option: --bogus\n\nUsage:/)
    expect(process.exitCode).toBe(1)
  })

  it('asks for a newer Node before loading anything that needs one', async () => {
    expect(await main([], { nodeVersion: '20.11.1' })).toBeUndefined()
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/needs Node.js 22 or newer, and this is 20.11.1/))
  })
})
