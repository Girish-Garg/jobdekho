import { spawn } from 'node:child_process'
import { killTree } from './kill-tree.js'

// Node refuses to run a .cmd or .bat without a shell, and that is exactly what
// an npm global install leaves on Windows. Only those go through cmd.exe; a
// native binary runs direct, so no command line is built for a shell to parse
// and the deprecation Node raises for shell:true with an args array never fires.
const needsShell = (file) => /\.(cmd|bat)$/i.test(file)

// `--tools ""` is how the CLI is told "no tools", and on the cmd.exe path an
// empty argument has to be spelled as a pair of quotes or it vanishes from
// the line, which would hand the call the CLI's default of every tool.
const quoted = (arg) => (arg === '' || /\s/.test(arg) ? `"${arg}"` : arg)

// How long a killed CLI gets to exit before the call is reported ended anyway.
const EXIT_WAIT_MS = 5000

// Every piece of the command line is a fixed literal: `file` came from the
// PATH lookup and `args` from the provider registry, plus at most a model id
// detection listed, of plain characters only (see cli-models.js). Anything
// user-supplied goes over stdin, which is what keeps quoting and injection
// out of the picture and sidesteps argv length limits on a long resume.
//
// `cwd` is the working directory the CLI sees. Callers hand in an empty
// directory made for the call, so a tool that slipped past the policy would
// find nothing to read there and no project settings to pick up.
function start(file, args, cwd) {
  const options = { cwd, windowsHide: true }
  if (!needsShell(file)) return spawn(file, args, options)
  return spawn([`"${file}"`, ...args.map(quoted)].join(' '), { ...options, shell: true })
}

// Runs one process to completion. Resolves with whatever it printed and how it
// exited; the caller decides what a non-zero exit means. Rejects only when the
// process could not be run at all (err.code ENOENT), outlived its timeout
// (err.code ETIMEDOUT) or was stopped through `signal` (err.code EABORTED),
// since those are the cases no exit code describes. `onStdout` sees the
// output as it arrives, for an answer shown while it is written; it is read
// as UTF-8 text, so a character split across two chunks stays whole.
export function runCli({ file, args, input, timeoutMs, cwd, signal = null, onStdout = null }) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(Object.assign(new Error(`${file} was stopped before it started`), { code: 'EABORTED' }))
      return
    }
    const child = start(file, args, cwd)
    let stdout = ''
    let stderr = ''
    let settled = false
    let ending = null
    const fail = (code, message) => {
      if (settled) return
      settled = true
      reject(Object.assign(new Error(message), { code }))
    }
    // A stop or a timeout is reported once the CLI has exited, not the moment
    // it is killed: until then Windows holds the directory it ran in, and
    // removing that failed the call (see scratch-dir.js). One that will not
    // die is reported anyway after a few seconds.
    const end = (code, message) => () => {
      if (ending || settled) return
      ending = { code, message }
      killTree(child)
      setTimeout(() => fail(code, message), EXIT_WAIT_MS).unref?.()
    }
    const timer = setTimeout(end('ETIMEDOUT', `${file} did not exit within ${timeoutMs}ms`), timeoutMs)
    const stop = end('EABORTED', `${file} was stopped`)
    signal?.addEventListener('abort', stop, { once: true })
    const done = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', stop)
    }

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (d) => { stdout += d; onStdout?.(d) })
    child.stderr.on('data', (d) => { stderr += d })
    child.on('error', (err) => { done(); fail(err.code, err.message) })
    child.on('close', (code) => {
      done()
      if (ending) fail(ending.code, ending.message)
      if (settled) return
      settled = true
      resolve({ stdout, stderr, code })
    })
    // A child that exits before reading its input (a bad login, a crash) closes
    // the pipe, and an unhandled EPIPE here would take the whole server down.
    // The close handler already reports the real failure.
    child.stdin.on('error', () => {})
    child.stdin.end(input)
  })
}
