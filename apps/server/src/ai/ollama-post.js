import { ProviderError } from './errors.js'
import { NOT_RUNNING } from './ollama-origin.js'

// One POST to the local Ollama server, shared by a plain request
// (ollama-request.js) and a web call's turns and tools (ollama-web.js).
//
// `think: false` is asked for because a reasoning fine-tune left to its
// template's default was still thinking after five minutes on a one-line
// prompt (measured on 0.32.12), where with thinking off it answered in 1.4 s.
// A model with no thinking switch may refuse the field, so it is asked again
// without it.
export async function postOllama(http, { url, body, signal }, provider) {
  const res = await send(http, { url, body, signal }, provider)
  if (res.status !== 400 || !('think' in body) || !/think/i.test(res.body?.error ?? '')) return res
  const { think: _think, ...plain } = body
  return send(http, { url, body: plain, signal }, provider)
}

// A refused connection is a server that is not up, the one failure another
// AI might answer instead of (see fallback.js). An aborted request is the
// call's own timeout and is left for call.js to report as one.
async function send(http, { url, body, signal }, provider) {
  try {
    return await http({ url, method: 'POST', body, signal })
  } catch (err) {
    if (signal?.aborted) throw err
    if (err?.code === 'ECONNREFUSED') throw new ProviderError('not_found', provider, NOT_RUNNING)
    throw new ProviderError('failed', provider, String(err?.message || err).slice(0, 200))
  }
}
