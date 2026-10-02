import { homedir } from 'node:os'
import { posix, win32 } from 'node:path'

// Where the `jobdekho` command keeps a person's data when they name no
// folder: the place each system sets aside for an app's own files. Not
// beside the code, which npx downloads afresh into its cache for each new
// version, so an update would otherwise start everyone from nothing.
export function dataHome({ platform = process.platform, env = process.env, home = homedir() } = {}) {
  if (platform === 'win32') return win32.join(env.APPDATA || win32.join(home, 'AppData', 'Roaming'), 'JobDekho')
  if (platform === 'darwin') return posix.join(home, 'Library', 'Application Support', 'JobDekho')
  return posix.join(env.XDG_DATA_HOME || posix.join(home, '.local', 'share'), 'jobdekho')
}
