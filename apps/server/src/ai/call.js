import { locateBinary } from './locate.js'
import { runCli } from './spawn.js'
import { ProviderError } from './errors.js'
import { startEvent, progressEvent } from './events.js'

const DEFAULT_TIMEOUT_MS = 120000

// Long enough that a browser watching the stream sees the call is alive, short
// enough that nobody wonders whether it hung.
const HEARTBEAT_MS = 5000

// One prompt to one provider, answered with the model's text. Reading a shape
// out of that text is the feature's job, because every feature asks for a
// different one.
//
// `run` and `locate` are injectable so a test never spawns a real CLI, and so
// the route layer can hand in fakes through one decorator.
export async function callProvider({
  provider, prompt, timeoutMs = DEFAULT_TIMEOUT_MS, emit = () => {},
  run = runCli, locate = locateBinary, heartbeatMs = HEARTBEAT_MS, now = Date.now,
}) {
  const file = locate(provider.binary)
  if (!file) throw new ProviderError('not_found', provider)

  emit(startEvent({ provider: provider.id, path: file }))
  emit(progressEvent({ stage: 'send', chars: prompt.length }))
  const started = now()
  const beat = setInterval(() => emit(progressEvent({ stage: 'wait', elapsedMs: now() - started })), heartbeatMs)
  let result
  try {
    result = await run({ file, args: provider.promptArgs, input: prompt, timeoutMs })
  } catch (err) {
    throw notRun(err, provider, timeoutMs)
  } finally {
    clearInterval(beat)
  }

  if (result.code !== 0) throw exited(result, provider)
  const text = provider.unwrap(result.stdout, provider)
  emit(progressEvent({ stage: 'reply', elapsedMs: now() - started, chars: text.length }))
  return { provider: provider.id, text }
}

function notRun(err, provider, timeoutMs) {
  if (err.code === 'ETIMEDOUT') return new ProviderError('timeout', provider, `${Math.round(timeoutMs / 1000)} seconds`)
  if (err.code === 'ENOENT') return new ProviderError('not_found', provider)
  return err
}

// A CLI that is installed but not signed in usually says so on stderr and
// exits non-zero, which is the other route an expired login takes.
function exited({ stderr, code }, provider) {
  const detail = stderr.trim().slice(0, 200) || `exited with code ${code}`
  return new ProviderError(provider.loginPattern.test(detail) ? 'login' : 'failed', provider, detail)
}
