import { accessSync, constants } from 'node:fs'
import { win32, posix } from 'node:path'

// Once a shell is involved, spawn can no longer say "not found": cmd.exe exits
// 1 with "is not recognized as an internal or external command" and sh exits
// 127 with "not found", and neither raises ENOENT. The old extract.js relied on
// ENOENT and so its "not found on PATH" message could never fire. The lookup
// happens here instead, once, and hands back the file spawn will actually run.
//
// On Windows only the PATHEXT forms count: an npm global install leaves both a
// bare `gemini` sh script and a `gemini.cmd` beside it, and cmd.exe can only
// run the second.
const WINDOWS_EXTS = '.COM;.EXE;.BAT;.CMD'

function runnable(file) {
  try {
    accessSync(file, constants.X_OK)
    return true
  } catch {
    return false
  }
}

export function locateBinary(name, { env = process.env, platform = process.platform, exists = runnable } = {}) {
  const path = platform === 'win32' ? win32 : posix
  const dirs = String(env.PATH ?? env.Path ?? '').split(path.delimiter).filter(Boolean)
  const exts = platform === 'win32'
    ? String(env.PATHEXT || WINDOWS_EXTS).split(';').filter(Boolean).map((e) => e.toLowerCase())
    : ['']
  for (const dir of dirs) {
    for (const ext of exts) {
      const file = path.join(dir, name + ext)
      if (exists(file)) return file
    }
  }
  return null
}
