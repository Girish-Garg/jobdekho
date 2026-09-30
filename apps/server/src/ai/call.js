import { locateBinary } from './locate.js'
import { runStaged } from './staged-run.js'
import { inEmptyDir } from './scratch-dir.js'
import { httpJson, offline } from './http-json.js'
import { ProviderError, stoppedBy } from './errors.js'
import { startEvent, progressEvent } from './events.js'
import { overProcess } from './over-process.js'
import { overRequest } from './over-request.js'

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
// different one. `json` says that shape is one JSON object, as it is for every
// feature today (see loose-json.js): a provider that can be held to it
// (Ollama) is, and a CLI ignores it.
//
// `tools` is the policy the feature chose (see policies.js) and has no
// default on purpose: leaving it out is a bug that must fail before a CLI
// starts, not a call that runs with every tool the CLI has. A provider that
// cannot honour the policy is the same kind of bug: select.js never picks
// one, so reaching here with it is a caller wiring the wrong CLI in.
//
// A CLI is a process (over-process.js); a provider with a request hook is a
// local API (over-request.js). Both get the same events, heartbeat, timeout
// and retry here, so a browser cannot tell them apart but by name.
//
// `onText` asks for the model's text as it is written, for a CLI that can
// print it that way (`textOf`, `streamArgs` in providers.js); one that
// cannot answers whole, as before. `signal` stops the call where it is.
//
// `run`, `locate`, `scratch`, `http` and `sleep` are injectable so a test never
// spawns a real CLI, touches the real temp directory, reaches a real model
// server or waits in real time. A caller that fakes `run` but not `http`
// gets a network where nothing answers (see http-json.js).
export async function callProvider({
  provider, prompt, tools, timeoutMs = DEFAULT_TIMEOUT_MS, emit = () => {}, json = true, onText = null, signal = null,
  run = runStaged, locate = locateBinary, scratch = inEmptyDir, http = run === runStaged ? httpJson : offline,
  heartbeatMs = HEARTBEAT_MS, now = Date.now, sleep = pause, busyWaits = BUSY_WAITS_MS,
}) {
  const policyArgs = provider.promptArgs(tools)
  if (!policyArgs) throw new Error(`${provider.label} cannot honour the "${tools}" tool policy and should not have been chosen for it`)
  const live = Boolean(onText && provider.textOf)
  // The model select.js bound, for a CLI that takes a flag for it (see
  // cli-models.js); none when it is the CLI's own default.
  const args = [...(live ? provider.streamArgs(policyArgs) : policyArgs), ...(provider.modelArgs?.(provider.model) ?? [])]
  // A provider behind an API has no binary to find; the start event names
  // the model that will answer instead, the one the person picked.
  const file = provider.request ? provider.model?.id ?? provider.id : locate(provider.binary)
  if (!file) throw new ProviderError('not_found', provider)
  const limit = timeoutMs * (provider.timeoutScale ?? 1)

  // The send event counts the prompt, not the wrapper a CLI's input protocol
  // adds around it: the wrapper is not content anyone wrote.
  emit(startEvent({ provider: provider.id, path: file }))
  emit(progressEvent({ stage: 'send', chars: prompt.length }))
  const started = now()
  const call = { file, args, provider, prompt, tools, json, timeoutMs: limit, run, scratch, http, signal, onText: live ? onText : null }
  const ask = () => (provider.request ? overRequest(call) : overProcess(call))

  for (let tries = 0; ; tries += 1) {
    if (signal?.aborted) throw stoppedBy(provider)
    try {
      const text = await beating(ask, { emit, heartbeatMs, now, started })
      emit(progressEvent({ stage: 'reply', elapsedMs: now() - started, chars: text.length }))
      return { provider: provider.id, text }
    } catch (err) {
      if (err?.kind !== 'busy' || tries >= busyWaits.length) throw err
      emit(progressEvent({ stage: 'retry', elapsedMs: now() - started, attempt: tries + 2 }))
      await sleep(busyWaits[tries])
    }
  }
}

async function beating(work, { emit, heartbeatMs, now, started }) {
  const beat = setInterval(() => emit(progressEvent({ stage: 'wait', elapsedMs: now() - started })), heartbeatMs)
  try {
    return await work()
  } finally {
    clearInterval(beat)
  }
}
