import { spawn, execFile } from 'node:child_process'

// A normal window of the person's own Chrome or Edge on the profile Apply
// assist keeps (see profile-dir.js): no automation flag, no debugging pipe,
// nothing JobDekho drives or reads. Google refuses to sign anyone in from a
// browser that software controls ("This browser or app may not be secure")
// and says to use another browser; this is that browser. The person signs in
// to the job site here, through Google if they like, and closes it; the site's
// own sign-in is then in the profile when Apply assist opens it again.
//
// Only while no Apply browser runs on the profile: Chrome hands a second start
// on a profile already in use to the running one, which here is the driven one.
const CLOSE_WAIT_MS = 10000

let open = null

export function openSignInWindow({ executable, profileDir, url, launch = spawn }) {
  if (open) return open
  const child = launch(executable, [`--user-data-dir=${profileDir}`, '--no-first-run', '--no-default-browser-check', url], { stdio: 'ignore' })
  const opened = { child, url }
  open = opened
  const gone = () => { if (open === opened) open = null }
  child.once('exit', gone)
  child.once('error', gone)
  return opened
}

export const signInWindowOpen = () => Boolean(open)

// Asks the window to close the way its own close button would, so the browser
// writes the sign-in it holds to disk; one that will not close in time is
// ended. A Chrome killed outright can lose cookies it had not yet written.
export async function closeSignInWindow({ platform = process.platform, exec = execFile } = {}) {
  const window = open
  if (!window) return
  const exited = new Promise((resolve) => window.child.once('exit', resolve))
  if (platform === 'win32') exec('taskkill', ['/PID', String(window.child.pid), '/T'], { windowsHide: true }, () => {})
  else window.child.kill('SIGTERM')
  const timer = new Promise((resolve) => setTimeout(resolve, CLOSE_WAIT_MS, 'late'))
  if ((await Promise.race([exited, timer])) === 'late') {
    if (platform === 'win32') exec('taskkill', ['/PID', String(window.child.pid), '/T', '/F'], { windowsHide: true }, () => {})
    else window.child.kill('SIGKILL')
  }
  if (open === window) open = null
}
