import { existsSync } from 'node:fs'
import { win32, posix } from 'node:path'
import { locateBinary } from '../ai/locate.js'

// Apply assist drives a browser the person already has and never downloads
// one: Chrome where it is installed, then Edge, which every Windows machine
// has, then Chromium. JOBDEKHO_APPLY_BROWSER names one outright, for an
// unusual install; a path that is not there is ignored rather than trusted,
// so a stale setting falls back to the search instead of failing every open.
const WINDOWS = [
  ['Google Chrome', 'ProgramFiles', 'Google\\Chrome\\Application\\chrome.exe'],
  ['Google Chrome', 'ProgramFiles(x86)', 'Google\\Chrome\\Application\\chrome.exe'],
  ['Google Chrome', 'LOCALAPPDATA', 'Google\\Chrome\\Application\\chrome.exe'],
  ['Microsoft Edge', 'ProgramFiles(x86)', 'Microsoft\\Edge\\Application\\msedge.exe'],
  ['Microsoft Edge', 'ProgramFiles', 'Microsoft\\Edge\\Application\\msedge.exe'],
]

const MAC = [
  ['Google Chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
  ['Google Chrome', '~/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
  ['Microsoft Edge', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
  ['Chromium', '/Applications/Chromium.app/Contents/MacOS/Chromium'],
]

// Linux installs put a launcher on PATH far more reliably than in any one
// directory, so PATH is asked first and the usual install folders after.
const LINUX_PATH = [
  ['Google Chrome', 'google-chrome-stable'],
  ['Google Chrome', 'google-chrome'],
  ['Microsoft Edge', 'microsoft-edge-stable'],
  ['Microsoft Edge', 'microsoft-edge'],
  ['Chromium', 'chromium'],
  ['Chromium', 'chromium-browser'],
]

const LINUX_FILES = [
  ['Google Chrome', '/opt/google/chrome/chrome'],
  ['Microsoft Edge', '/opt/microsoft/msedge/msedge'],
  ['Chromium', '/usr/bin/chromium'],
]

function nameOf(path) {
  const file = path.toLowerCase()
  if (file.includes('edge')) return 'Microsoft Edge'
  if (file.includes('chromium')) return 'Chromium'
  if (file.includes('chrome')) return 'Google Chrome'
  return 'Chromium-based browser'
}

function fixedPlaces(env, platform) {
  if (platform === 'win32') {
    return WINDOWS.filter(([, root]) => env[root]).map(([name, root, rest]) => [name, win32.join(env[root], rest)])
  }
  if (platform === 'darwin') {
    const home = env.HOME || ''
    return MAC.map(([name, path]) => [name, path.startsWith('~') ? posix.join(home, path.slice(2)) : path])
  }
  return LINUX_FILES
}

// { name, path } of the browser to drive, or null when there is none. Every
// lookup is injectable so a test never depends on what this machine has.
export function findBrowser({ env = process.env, platform = process.platform, exists = existsSync, locate = locateBinary } = {}) {
  const chosen = env.JOBDEKHO_APPLY_BROWSER
  if (chosen && exists(chosen)) return { name: nameOf(chosen), path: chosen }
  if (platform === 'linux') {
    for (const [name, binary] of LINUX_PATH) {
      const path = locate(binary, { env, platform })
      if (path) return { name, path }
    }
  }
  for (const [name, path] of fixedPlaces(env, platform)) {
    if (exists(path)) return { name, path }
  }
  return null
}
