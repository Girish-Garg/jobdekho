import { ProviderError } from './errors.js'
import { httpJson } from './http-json.js'
import { ollamaOrigin, NOT_RUNNING } from './ollama-origin.js'
import { contextFor, MIN_REPLY_TOKENS } from './ollama-context.js'
import { stripThink } from './think-tags.js'

// One prompt to the local Ollama server's /api/generate, answered with the
// model's text (see providers.js for the hook this is). What it asks for:
//   stream false  the whole reply as one body, which http-json.js can wait
//                 for however long the call's timeout allows
//   think false   measured on 0.32.12 with a reasoning fine-tune: left to its
//                 template's default it was still thinking after five
//                 minutes on a one-line prompt, and with thinking off it
//                 answered in 1.4 s. A model with no thinking switch may
//                 refuse the field, so it is asked again without it.
//   format json   when the feature reads one JSON object, as every JobDekho
//                 feature does, the model is held to that shape rather than
//                 trusted to follow the instruction
//   options       a context sized to the prompt, see ollama-context.js
//
// `model` is { name, contextLength }, bound by select.js from detection.
export async function requestOllama({ prompt, json = true, model, signal, http = httpJson, env = process.env }, provider) {
  if (!model?.name) throw new ProviderError('not_found', provider, 'Ollama has no model picked to answer with. Pick one in Settings.')
  const { promptTokens, numCtx, numPredict } = contextFor(prompt, model.contextLength)
  if (numPredict < MIN_REPLY_TOKENS) throw new ProviderError('failed', provider, tooLong(model, promptTokens))
  const body = {
    model: model.name, prompt, stream: false, think: false, ...(json && { format: 'json' }),
    options: { num_ctx: numCtx, num_predict: numPredict },
  }
  const url = `${ollamaOrigin(env)}/api/generate`
  let res = await send(http, { url, body, signal }, provider)
  if (res.status === 400 && /think/i.test(res.body?.error ?? '')) {
    const { think: _think, ...plain } = body
    res = await send(http, { url, body: plain, signal }, provider)
  }
  return readReply(res, model, numCtx, provider)
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

// A model removed since detection listed it is a 404 naming it, which is a
// missing install as far as the person is concerned. A reply that stopped
// at its cap was cut off, and a feature would only call it unreadable.
function readReply({ status, body }, model, numCtx, provider) {
  if (status === 404) {
    throw new ProviderError('not_found', provider,
      `Ollama no longer has the model "${model.name}". Pick another in Settings, or run "ollama pull ${model.name}" in a terminal.`)
  }
  if (status !== 200) throw new ProviderError('failed', provider, String(body?.error || `Ollama answered with status ${status}`).slice(0, 200))
  if (body?.done_reason === 'length') {
    throw new ProviderError('failed', provider, `the reply filled the ${numCtx}-token context it was given and was cut off`)
  }
  return stripThink(typeof body?.response === 'string' ? body.response : '')
}

const tooLong = (model, tokens) => `this request is about ${tokens} tokens, too long for "${model.name}" to read and answer `
  + `(it holds ${model.contextLength}); pick a model with a longer context in Settings`
