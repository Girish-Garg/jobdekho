import { execFile } from 'node:child_process'

// Which processes are running, with their parent and command line: the one
// way to find a browser this server started once the library that started
// it can no longer say (a persistent context never exposes its process id,
// and a crashed run leaves no handle at all). Fixed arguments, no shell, and
// asynchronous: the Windows census takes about a second, which must not
// stall every other request the server is answering.
const PS_WINDOWS = 'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress'

const runAsync = (file, args) => new Promise((resolve) => {
  execFile(file, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 }, (_err, stdout) => resolve(stdout ?? ''))
})

function windowsRows(out) {
  if (!out.trim()) return []
  const rows = JSON.parse(out)
  return (Array.isArray(rows) ? rows : [rows]).map((r) => ({
    pid: Number(r.ProcessId), ppid: Number(r.ParentProcessId), cmd: String(r.CommandLine ?? ''),
  }))
}

function posixRows(out) {
  return out.split('\n').map((line) => /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line)).filter(Boolean)
    .map(([, pid, ppid, cmd]) => ({ pid: Number(pid), ppid: Number(ppid), cmd }))
}

export async function listProcesses({ platform = process.platform, run = runAsync } = {}) {
  try {
    if (platform === 'win32') return windowsRows(await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', PS_WINDOWS]))
    return posixRows(await run('ps', ['-axo', 'pid=,ppid=,command=']))
  } catch {
    return []
  }
}

// Every process under the browsers whose own command line names `marker`
// (one profile folder as text, or a pattern for all of them). The roots are
// the browser processes proper: their helpers carry --type=.
export function treeUnder(rows, marker) {
  const names = (cmd) => (typeof marker === 'string' ? cmd.includes(marker) : marker.test(cmd))
  const roots = rows.filter((r) => names(r.cmd) && !r.cmd.includes('--type=')).map((r) => r.pid)
  const ids = new Set(roots)
  for (let grew = true; grew;) {
    grew = false
    for (const r of rows) {
      if (!ids.has(r.pid) && ids.has(r.ppid)) {
        ids.add(r.pid)
        grew = true
      }
    }
  }
  return { roots, pids: [...ids] }
}
