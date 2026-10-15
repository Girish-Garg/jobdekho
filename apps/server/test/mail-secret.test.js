import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, existsSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSecrets } from '@jobdekho/server/mail/secret.js'
import { FILES } from '@jobdekho/store/files.js'

// A fake runner stands in for powershell, security and secret-tool: nothing
// here touches the real Keychain, keyring or DPAPI. Made-up values only.
const SECRET = 'abcdefghijklmnop'
const ADDRESS = 'me@example.com'

let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-mail-secret-')) })
afterEach(() => rmSync(dir, { recursive: true, force: true }))

const ok = (stdout = '') => ({ stdout, stderr: '', code: 0 })
const neverOnACommandLine = (run) => run.mock.calls.forEach(([call]) => expect(call.args.join(' ')).not.toContain(SECRET))

describe('on Windows', () => {
  it('keeps only what DPAPI made of it, sent over stdin both ways', async () => {
    const run = vi.fn(async ({ input, args }) => (args.at(-1).includes('::Protect(') ? ok(`BLOB(${input})\n`) : ok(input.trim().replace(/^BLOB\((.*)\)$/, '$1'))))
    const secrets = createSecrets({ dir, platform: 'win32', run })
    expect(await secrets.keep(ADDRESS, SECRET)).toBe('windows')
    expect(readFileSync(join(dir, FILES.mailSecret), 'utf8')).toBe(`BLOB(${SECRET})\n`)
    expect(await secrets.read(ADDRESS, 'windows')).toBe(SECRET)
    expect(run.mock.calls.every(([call]) => call.file === 'powershell.exe')).toBe(true)
    neverOnACommandLine(run)
    await secrets.forget(ADDRESS, 'windows')
    expect(existsSync(join(dir, FILES.mailSecret))).toBe(false)
    expect(await secrets.read(ADDRESS, 'windows')).toBeNull()
  })

  it('says it could not keep it when DPAPI fails, without the password in the message', async () => {
    const secrets = createSecrets({ dir, platform: 'win32', run: vi.fn(async () => ({ stdout: '', stderr: 'boom', code: 1 })) })
    const err = await secrets.keep(ADDRESS, SECRET).then(() => null, (e) => e)
    expect(err.message).toMatch(/could not keep the app password safely/)
    expect(err.message).not.toContain(SECRET)
  })
})

describe('on a Mac', () => {
  it('saves to the Keychain through security -i on stdin, and reads it back by address', async () => {
    const run = vi.fn(async ({ args }) => (args[0] === 'find-generic-password' ? ok(`${SECRET}\n`) : ok()))
    const secrets = createSecrets({ dir, platform: 'darwin', run })
    expect(await secrets.keep(ADDRESS, SECRET)).toBe('keychain')
    const [save] = run.mock.calls[0]
    expect(save).toMatchObject({ file: 'security', args: ['-i'] })
    expect(save.input).toBe(`add-generic-password -U -a "${ADDRESS}" -s "JobDekho mail" -w "${SECRET}"\n`)
    expect(await secrets.read(ADDRESS, 'keychain')).toBe(SECRET)
    neverOnACommandLine(run)
  })
})

describe('on Linux', () => {
  it('uses the desktop keyring through secret-tool on stdin', async () => {
    const run = vi.fn(async ({ args }) => (args[0] === 'lookup' ? ok(SECRET) : ok()))
    const secrets = createSecrets({ dir, platform: 'linux', run })
    expect(await secrets.keep(ADDRESS, SECRET)).toBe('secret-service')
    expect(run.mock.calls[0][0]).toMatchObject({ file: 'secret-tool', input: SECRET })
    expect(await secrets.read(ADDRESS, 'secret-service')).toBe(SECRET)
    neverOnACommandLine(run)
  })

  it('falls back to a file only this account may read when there is no keyring', async () => {
    const run = vi.fn(async () => { throw Object.assign(new Error('spawn secret-tool ENOENT'), { code: 'ENOENT' }) })
    const secrets = createSecrets({ dir, platform: 'linux', run })
    expect(await secrets.keep(ADDRESS, SECRET)).toBe('file')
    expect(await secrets.read(ADDRESS, 'file')).toBe(SECRET)
    if (process.platform !== 'win32') expect(statSync(join(dir, FILES.mailSecret)).mode & 0o777).toBe(0o600)
    expect(await secrets.read(ADDRESS, 'keychain')).toBeNull()
  })
})
