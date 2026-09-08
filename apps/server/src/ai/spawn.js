import { spawn } from 'node:child_process'

// Node refuses to run a .cmd or .bat without a shell, and that is exactly what
// an npm global install leaves on Windows. Only those go through cmd.exe; a
// native binary runs direct, so no command line is built for a shell to parse
// and the deprecation Node raises for shell:true with an args array never fires.
const needsShell = (file) => /\.(cmd|bat)$/i.test(file)

// Every piece of the command line is a fixed literal: `file` came from the
// PATH lookup and `args` from the provider registry. Anything user-supplied
// goes over stdin, which is what keeps quoting and injection out of the
// picture and sidesteps argv length limits on a long resume.
function start(file, args) {
  if (!needsShell(file)) return spawn(file, args, { windowsHide: true })
  return spawn([`"${file}"`, ...args].join(' '), { shell: true, windowsHide: true })
}

// Runs one process to completion. Resolves with whatever it printed and how it
// exited; the caller decides what a non-zero exit means. Rejects only when the
// process could not be run at all (err.code ENOENT) or outlived its timeout
// (err.code ETIMEDOUT), since those are the two cases no exit code describes.
export function runCli({ file, args, input, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const child = start(file, args)
    let stdout = ''
    let stderr = ''
    const fail = (code, message) => {
      const err = new Error(message)
      err.code = code
      reject(err)
    }
    const timer = setTimeout(() => {
      child.kill()
      fail('ETIMEDOUT', `${file} did not exit within ${timeoutMs}ms`)
    }, timeoutMs)

    child.stdout.on('data', (d) => { stdout += d })
    child.stderr.on('data', (d) => { stderr += d })
    child.on('error', (err) => { clearTimeout(timer); fail(err.code, err.message) })
    child.on('close', (code) => { clearTimeout(timer); resolve({ stdout, stderr, code }) })
    // A child that exits before reading its input (a bad login, a crash) closes
    // the pipe, and an unhandled EPIPE here would take the whole server down.
    // The close handler already reports the real failure.
    child.stdin.on('error', () => {})
    child.stdin.end(input)
  })
}
