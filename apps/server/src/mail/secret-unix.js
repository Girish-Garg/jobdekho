import { readFileSync, writeFileSync, chmodSync, rmSync } from 'node:fs'

// The app password on a Mac and on Linux. Each keeper has keep(address,
// secret), read(address) and forget(address), and the secret goes over
// stdin, never on a command line. JobDekho's tests run these with a fake
// runner; the commands follow Apple's `security` and libsecret's
// `secret-tool` manuals, and have not been run on a Mac or Linux by them.
//
// Only an app password reaches here: 16 letters (see account.js), and an
// address cleanEmail passed, with no quote or space in it, so the line
// `security -i` reads cannot be broken out of.
const SERVICE = 'JobDekho mail'
const TIMEOUT_MS = 30000

const ok = (out, what) => {
  if (out.code !== 0) throw new Error(`could not ${what} the app password`)
  return out
}

// macOS: the login Keychain, through `security -i`, which reads its
// commands from stdin, so the password is in no process's arguments.
export function keychainKeeper({ run }) {
  const security = (args, input = '') => run({ file: 'security', args, input, timeoutMs: TIMEOUT_MS })
  return {
    keptIn: 'keychain',
    async keep(address, secret) {
      ok(await security(['-i'], `add-generic-password -U -a "${address}" -s "${SERVICE}" -w "${secret}"\n`), 'save')
    },
    async read(address) {
      const out = await security(['find-generic-password', '-a', address, '-s', SERVICE, '-w'])
      return out.code === 0 ? out.stdout.trim() || null : null
    },
    async forget(address) {
      await security(['delete-generic-password', '-a', address, '-s', SERVICE])
    },
  }
}

// Linux with a desktop keyring: `secret-tool store` reads the secret from
// stdin. One with none (a server, a bare WSL) fails here, and the file
// below is used instead (see secret.js).
export function secretServiceKeeper({ run }) {
  const tool = (args, input = '') => run({ file: 'secret-tool', args, input, timeoutMs: TIMEOUT_MS })
  const attrs = (address) => ['service', 'jobdekho-mail', 'account', address]
  return {
    keptIn: 'secret-service',
    async keep(address, secret) {
      ok(await tool(['store', `--label=${SERVICE}`, ...attrs(address)], secret), 'save')
    },
    async read(address) {
      const out = await tool(['lookup', ...attrs(address)])
      return out.code === 0 ? out.stdout.trim() || null : null
    },
    async forget(address) {
      await tool(['clear', ...attrs(address)])
    },
  }
}

// The last resort: a file only this account may read (mode 600), which is
// what the card then says, so nobody believes it is in a keyring.
export function fileKeeper({ file }) {
  return {
    keptIn: 'file',
    async keep(_address, secret) {
      writeFileSync(file, `${secret}\n`, { mode: 0o600 })
      chmodSync(file, 0o600)
    },
    async read() {
      try {
        return readFileSync(file, 'utf8').trim() || null
      } catch {
        return null
      }
    },
    async forget() {
      rmSync(file, { force: true })
    },
  }
}
