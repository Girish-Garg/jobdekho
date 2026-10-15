import { join } from 'node:path'
import { FILES } from '@jobdekho/store/files.js'
import { runCli } from '../ai/spawn.js'
import { windowsKeeper } from './secret-windows.js'
import { keychainKeeper, secretServiceKeeper, fileKeeper } from './secret-unix.js'

// Where the Gmail app password is kept: the computer's own protected
// storage, never a JSON file beside the rest of the data. Windows uses
// DPAPI, a Mac its Keychain, Linux its desktop keyring, and only a Linux
// with no keyring a file only this account can read. Which one held it is
// saved with the address (`keptIn`, see the store's mail-log.js), so it is
// read back from the same place even if a keyring turns up later.
function keepersFor({ dir, platform, run }) {
  const file = join(dir, FILES.mailSecret)
  if (platform === 'win32') return [windowsKeeper({ file, run })]
  if (platform === 'darwin') return [keychainKeeper({ run })]
  return [secretServiceKeeper({ run }), fileKeeper({ file })]
}

// The one place the app password is handled. Nothing it throws carries the
// password: each keeper's message names what failed, not what it held.
export function createSecrets({ dir, platform = process.platform, run = runCli }) {
  const keepers = keepersFor({ dir, platform, run })
  const named = (keptIn) => keepers.find((keeper) => keeper.keptIn === keptIn) ?? null
  return {
    // Resolves where it was kept, the first keeper that took it.
    async keep(address, secret) {
      let failure = null
      for (const keeper of keepers) {
        try {
          await keeper.keep(address, secret)
          return keeper.keptIn
        } catch (err) {
          failure = err
        }
      }
      throw new Error(`This computer could not keep the app password safely (${failure?.message ?? 'no store'}).`)
    },
    async read(address, keptIn) {
      try {
        return (await named(keptIn)?.read(address)) ?? null
      } catch {
        return null
      }
    },
    async forget(address, keptIn) {
      try {
        await named(keptIn)?.forget(address)
      } catch {
        // Forgetting the address is what disconnects; a keyring that would
        // not delete its copy leaves one nothing will read again.
      }
    },
  }
}
