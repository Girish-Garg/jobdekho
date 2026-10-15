import { readFileSync, rmSync } from 'node:fs'
import { writeAtomic } from '@jobdekho/store/atomic-write.js'

// Windows keeps the app password with DPAPI under the person's own Windows
// account: the file in the data folder (mail-secret.bin) holds only what
// ProtectedData.Protect made of it, which no other account, and no other
// computer, can turn back into the password. So the data folder can be
// backed up, copied or attached to a bug report without handing it over.
//
// Windows PowerShell 5.1 is on every Windows this runs on and loads
// System.Security by name. The password goes over stdin, both ways, never
// on a command line, where any process could read it. The entropy ties the
// blob to JobDekho, so a script that unprotects everything the account owns
// still has to know it was this.
const SETUP = "$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; $e=[Text.Encoding]::UTF8.GetBytes('jobdekho-mail');"
const PROTECT = `${SETUP} $b=[Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd()); [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($b,$e,'CurrentUser'))`
const UNPROTECT = `${SETUP} $b=[Convert]::FromBase64String([Console]::In.ReadToEnd().Trim()); [Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($b,$e,'CurrentUser'))`

const TIMEOUT_MS = 30000
const powershell = (script) => ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script]

async function shell(run, script, input) {
  const out = await run({ file: 'powershell.exe', args: powershell(script), input, timeoutMs: TIMEOUT_MS })
  if (out.code !== 0) throw new Error(`Windows could not ${script === PROTECT ? 'protect' : 'read'} the app password`)
  return out.stdout.trim()
}

export function windowsKeeper({ file, run }) {
  return {
    keptIn: 'windows',
    async keep(_address, secret) {
      writeAtomic(file, `${await shell(run, PROTECT, secret)}\n`)
    },
    async read() {
      let blob
      try {
        blob = readFileSync(file, 'utf8').trim()
      } catch {
        return null
      }
      return blob ? (await shell(run, UNPROTECT, blob)) || null : null
    },
    async forget() {
      rmSync(file, { force: true })
    },
  }
}
