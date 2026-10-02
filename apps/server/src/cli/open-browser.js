import { spawn } from 'node:child_process'

// Each system's own way to open an address in the default browser. On
// Windows that is cmd's start, whose first quoted argument is a window
// title, hence the empty one; its arguments go through as written, so the
// one character cmd would read as its own in an address is escaped.
export function openCommand(url, platform = process.platform) {
  if (platform === 'win32') return { file: 'cmd', args: ['/c', 'start', '""', url.replace(/&/g, '^&')], verbatim: true }
  if (platform === 'darwin') return { file: 'open', args: [url], verbatim: false }
  return { file: 'xdg-open', args: [url], verbatim: false }
}

// Best effort: the address is printed either way, so a computer with no
// browser to open (a server, a bare Linux) loses nothing but the tab.
export function openBrowser(url, { platform = process.platform, run = spawn } = {}) {
  const { file, args, verbatim } = openCommand(url, platform)
  try {
    const child = run(file, args, { stdio: 'ignore', detached: true, windowsVerbatimArguments: verbatim })
    child.on?.('error', () => {})
    child.unref?.()
  } catch {}
}
