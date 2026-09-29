import { locateBinary } from './locate.js'
import { runStaged } from './staged-run.js'
import { inEmptyDir } from './scratch-dir.js'
import { ProviderError, classify } from './errors.js'
import { startEvent, progressEvent } from './events.js'

const DEFAULT_TIMEOUT_MS = 120000

// Long enough that a browser watching the stream sees the call is alive, short
// enough that nobody wonders whether it hung.
const HEARTBEAT_MS = 5000

// A busy CLI is waiting on its own token refresh, which settles in seconds.
// Two retries cover it; past that the person is told to wait a minute rather
// than have JobDekho hold the request open indefinitely.
const BUSY_WAITS_MS = [2000, 5000]
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// One prompt to one provider, answered with the model's text. Reading a shape
// out of that text is the feature's job, because every feature asks for a
// different one.
//
// `tools` is the policy the feature chose (see policies.js) and has no
// default on purpose: leaving it out is a bug that must fail before a CLI
// starts, not a call that runs with every tool the CLI has. A provider that
// cannot honour the policy is the same kind of bug: select.js never picks
// one, so reaching here with it is a caller wiring the wrong CLI in.
//
// `run`, `locate`, `scratch` and `sleep` are injectable so a test never
// spawns a real CLI, touches the real temp directory or waits in real time.
export async function callProvider({
  provider, prompt, tools, timeoutMs = DEFAULT_TIMEOUT_MS, emit = () => {},
  run = runStaged, locate = locateBinary, scratch = inEmptyDir, heartbeatMs = HEARTBEAT_MS, now = Date.now,
  sleep = pause, busyWaits = BUSY_WAITS_MS,
}) {
  const args = provider.promptArgs(tools)
  if (!args) throw new Error(`${provider.label} cannot honour the "${tools}" tool policy and should not have been chosen for it`)
  const file = locate(provider.binary)
  if (!file) throw new ProviderError('not_found', provider)

  // The send event counts the prompt, not the wrapper a CLI's input protocol
  // adds around it: the wrapper is not content anyone wrote.
  emit(startEvent({ provider: provider.id, path: file }))
  emit(progressEvent({ stage: 'send', chars: prompt.length }))
  const started = now()
  const call = { file, args, provider, prompt, tools, timeoutMs, run, scratch, emit, heartbeatMs, now, started }

  for (let tries = 0; ; tries += 1) {
    try {
      const text = await once(call)
      emit(progressEvent({ stage: 'reply', elapsedMs: now() - started, chars: text.length }))
      return { provider: provider.id, text }
    } catch (err) {
      if (err?.kind !== 'busy' || tries >= busyWaits.length) throw err
      emit(progressEvent({ stage: 'retry', elapsedMs: now() - started, attempt: tries + 2 }))
      await sleep(busyWaits[tries])
    }
  }
}

// A CLI that takes its toolset from a file in its directory gets the file
// there, and its word on what ran is checked once it has answered: an answer
// it cannot vouch for is not used (see agy-agent.js).
async function once({ file, args, provider, prompt, tools, timeoutMs, run, scratch, emit, heartbeatMs, now, started }) {
  const beat = setInterval(() => emit(progressEvent({ stage: 'wait', elapsedMs: now() - started })), heartbeatMs)
  const staged = provider.stage ? { files: provider.stage(tools), collect: provider.collect } : {}
  let result
  try {
    result = await scratch((cwd) => run({ file, args, input: provider.encodeInput(prompt), timeoutMs, cwd, ...staged }))
  } catch (err) {
    throw notRun(err, provider, timeoutMs)
  } finally {
    clearInterval(beat)
  }
  if (result.code !== 0) throw exited(result, provider)
  const text = provider.unwrap(result.stdout, provider)
  provider.verify?.({ ...result, tools }, provider)
  return text
}

function notRun(err, provider, timeoutMs) {
  if (err.code === 'ETIMEDOUT') return new ProviderError('timeout', provider, `${Math.round(timeoutMs / 1000)} seconds`)
  if (err.code === 'ENOENT') return new ProviderError('not_found', provider)
  return err
}

// A CLI that is installed but not signed in usually says so on stderr and
// exits non-zero. Claude Code 2.1 prints its is_error envelope on stdout AND
// exits 1 with nothing on stderr, so the envelope is read first or the person
// sees "exited with code 1" where the real sentence was.
function exited({ stdout, stderr, code }, provider) {
  try {
    provider.unwrap(stdout, provider)
  } catch (err) {
    if (err instanceof ProviderError) return err
  }
  const detail = stderr.trim().slice(0, 200) || `exited with code ${code}`
  return new ProviderError(classify(provider, detail), provider, detail)
}
