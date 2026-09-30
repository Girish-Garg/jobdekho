import { execFile } from 'node:child_process'

// Ends a CLI that is still running, because it was stopped or ran out of
// time. On Windows the whole tree goes: a CLI installed by npm is a .cmd run
// through cmd.exe (see spawn.js), and killing only that shell left the CLI
// under it answering on, on the person's subscription, with nobody to read
// what it wrote. Elsewhere the CLI is the child itself.
export function killTree(child, { platform = process.platform, exec = execFile } = {}) {
  if (!child?.pid || child.exitCode !== null) return
  if (platform === 'win32') {
    exec('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, () => {})
    return
  }
  child.kill('SIGTERM')
}
