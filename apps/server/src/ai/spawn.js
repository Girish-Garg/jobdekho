import { killTree } from './kill-tree.js'
import { runLimits } from './run-limits.js'
import { start } from './spawn-start.js'

// How long a killed CLI gets to exit before the call is reported ended anyway.
const EXIT_WAIT_MS = 5000

// How long a CLI that has given its whole answer gets to exit by itself.
const AFTER_ANSWER_MS = 2000

// Runs one process to completion. Resolves with whatever it printed and how it
// exited; the caller decides what a non-zero exit means. Rejects only when the
// process could not be run at all (err.code ENOENT), outlived its limits
// (err.code ETIMEDOUT, err.how 'quiet' or 'cap', see run-limits.js) or was
// stopped through `signal` (err.code EABORTED). `onStdout` sees the output as
// it arrives, read as UTF-8, so a character split across two chunks stays
// whole. `answered(stdout)` says the whole answer is in: the CLI then gets a
// moment to exit and is stopped if it has not, its exit counted as clean,
// since one lingering after its result would otherwise run the call into its
// time limit with the answer already in hand.
export function runCli({ file, args, input, timeoutMs, cwd, signal = null, onStdout = null, env = null, quietMs = null, answered = null }) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(Object.assign(new Error(`${file} was stopped before it started`), { code: 'EABORTED' }))
      return
    }
    const child = start(file, args, cwd, env)
    let stdout = ''
    let stderr = ''
    let settled = false
    let ending = null
    let whole = false
    const fail = ({ code, message, how }) => {
      if (settled) return
      settled = true
      reject(Object.assign(new Error(message), { code, how }))
    }
    const succeed = (code) => {
      if (settled) return
      settled = true
      resolve({ stdout, stderr, code })
    }
    // A stop or a timeout is reported once the CLI has exited, not the moment
    // it is killed: until then Windows holds the directory it ran in, and
    // removing that failed the call (see scratch-dir.js). One that will not
    // die is reported anyway after a few seconds.
    const end = (why) => () => {
      if (ending || settled) return
      ending = why
      killTree(child)
      setTimeout(() => fail(why), EXIT_WAIT_MS).unref?.()
    }
    const limit = (how) => end({ code: 'ETIMEDOUT', how, message: `${file} ${how === 'quiet' ? `wrote nothing for ${quietMs}ms` : `did not exit within ${timeoutMs}ms`}` })()
    const limits = runLimits({ timeoutMs, quietMs, onLimit: limit })
    const stop = end({ code: 'EABORTED', message: `${file} was stopped` })
    signal?.addEventListener('abort', stop, { once: true })
    const done = () => {
      limits.clear()
      signal?.removeEventListener('abort', stop)
    }
    const answerIn = () => {
      whole = true
      done()
      setTimeout(() => {
        if (settled) return
        killTree(child)
        setTimeout(() => succeed(0), EXIT_WAIT_MS).unref?.()
      }, AFTER_ANSWER_MS).unref?.()
    }

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (d) => {
      stdout += d
      onStdout?.(d)
      limits.heard()
      if (answered && !whole && !ending && answered(stdout)) answerIn()
    })
    child.stderr.on('data', (d) => { stderr += d })
    child.on('error', (err) => { done(); fail({ code: err.code, message: err.message }) })
    child.on('close', (code) => {
      done()
      if (ending) fail(ending)
      succeed(whole ? 0 : code)
    })
    // A child that exits before reading its input (a bad login, a crash) closes
    // the pipe, and an unhandled EPIPE here would take the whole server down.
    // The close handler already reports the real failure.
    child.stdin.on('error', () => {})
    child.stdin.end(input)
  })
}
