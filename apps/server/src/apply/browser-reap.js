import { execFile } from 'node:child_process'
import { listProcesses, treeUnder } from './process-census.js'
import { PROFILE_PREFIX, removeProfileDir, staleProfileDirs } from './profile-dir.js'

// Ends every browser process whose command line names `marker`, with all its
// helpers. The library's own close comes first and usually leaves nothing;
// this is the net under it, and the whole of the cleanup when JobDekho itself
// was killed mid-application and a browser outlived it.
const taskkill = (pid) => new Promise((resolve) => {
  execFile('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }, () => resolve())
})

async function killPids(roots, pids, platform) {
  // /T takes the whole tree with each root, so helpers go even if the
  // census missed one.
  if (platform === 'win32') {
    await Promise.all(roots.map(taskkill))
    return
  }
  for (const pid of [...pids].reverse()) {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      // Already gone.
    }
  }
}

export async function killBrowsers(marker, { platform = process.platform, census = listProcesses } = {}) {
  const { roots, pids } = treeUnder(await census({ platform }), marker)
  if (roots.length) await killPids(roots, pids, platform)
  return roots.length
}

// How many processes still belong to browsers naming `marker`; the end of
// every session, and the tests, want this to be zero.
export async function countBrowsers(marker, { platform = process.platform, census = listProcesses } = {}) {
  return treeUnder(await census({ platform }), marker).pids.length
}

// A browser started on one of Apply assist's profiles, and nothing else: the
// prefix has to be the profile folder a browser was given, so no other program
// that merely mentions it (an editor, a test run) is ever ended.
export const ORPHAN = new RegExp(`--user-data-dir=[^"\\n]*${PROFILE_PREFIX}`)

// Before the first Apply session after a start: browsers and profiles an
// earlier run left behind (a crash, a closed terminal) are ended and deleted,
// so a forgotten window cannot keep an application's cookies alive.
export async function reapOrphans(seams = {}) {
  const killed = await killBrowsers(ORPHAN, seams)
  for (const dir of staleProfileDirs()) removeProfileDir(dir)
  return killed
}
