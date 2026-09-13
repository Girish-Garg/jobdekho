import { locateBinary } from './locate.js'
import { runCli } from './spawn.js'
import { inEmptyDir } from './scratch-dir.js'
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
// `tools` is the policy the feature chose (see providers.js) and has no
// default on purpose: leaving it out is a bug that must fail before a CLI
// starts, not a call that runs with every tool the CLI has.
//
// `run`, `locate` and `scratch` are injectable so a test never spawns a real
// CLI or touches the real temp directory, and so the route layer can hand in
// fakes through one decorator.
export async function callProvider({
  provider, prompt, tools, timeoutMs = DEFAULT_TIMEOUT_MS, emit = () => {},
  run = runCli, locate = locateBinary, scratch = inEmptyDir, heartbeatMs = HEARTBEAT_MS, now = Date.now,
}) {
  const args = provider.promptArgs(tools)
  const file = locate(provider.binary)
  if (!file) throw new ProviderError('not_found', provider)

  emit(startEvent({ provider: provider.id, path: file }))
  emit(progressEvent({ stage: 'send', chars: prompt.length }))
  const started = now()
  const beat = setInterval(() => emit(progressEvent({ stage: 'wait', elapsedMs: now() - started })), heartbeatMs)
  let result
  try {
    result = await scratch((cwd) => run({ file, args, input: prompt, timeoutMs, cwd }))
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
// exits non-zero, which is the other route an expired login takes. Claude
// Code 2.1 takes both at once: it prints its is_error envelope on stdout AND
// exits 1 with nothing on stderr, so the envelope is read first or the
// person sees "exited with code 1" where "OAuth session expired" was.
function exited({ stdout, stderr, code }, provider) {
  try {
    provider.unwrap(stdout, provider)
  } catch (err) {
    if (err instanceof ProviderError) return err
  }
  const detail = stderr.trim().slice(0, 200) || `exited with code ${code}`
  return new ProviderError(provider.loginPattern.test(detail) ? 'login' : 'failed', provider, detail)
}
