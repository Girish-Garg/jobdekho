import { ProviderError } from './errors.js'
import { httpJson } from './http-json.js'
import { ollamaOrigin } from './ollama-origin.js'
import { contextFor, MIN_REPLY_TOKENS } from './ollama-context.js'
import { stripThink } from './think-tags.js'
import { postOllama } from './ollama-post.js'
import { checkReply, tooLong } from './ollama-reply.js'
import { requestOllamaWeb } from './ollama-web.js'

// One prompt to the local Ollama server's /api/generate, answered with the
// model's text (see ollama.js for the hook this is). A web call is a
// conversation with tools instead, and goes to ollama-web.js. What it asks for:
//   stream false  the whole reply as one body, which http-json.js can wait
//                 for however long the call's timeout allows
//   think false   see ollama-post.js
//   format json   when the feature reads one JSON object, as every JobDekho
//                 feature does, the model is held to that shape rather than
//                 trusted to follow the instruction
//   options       a context sized to the prompt, see ollama-context.js
//
// `model` is { id, contextLength, ... }, bound by select.js from detection.
export async function requestOllama({ prompt, tools = 'none', json = true, model, signal, http = httpJson, env = process.env }, provider) {
  if (!model?.id) throw new ProviderError('not_found', provider, 'Ollama has no model picked to answer with. Pick one in Settings.')
  if (tools === 'web') return requestOllamaWeb({ prompt, json, model, signal, http, env }, provider)
  const { promptTokens, numCtx, numPredict } = contextFor(prompt, model.contextLength)
  if (numPredict < MIN_REPLY_TOKENS) throw new ProviderError('failed', provider, tooLong(model, promptTokens))
  const body = {
    model: model.id, prompt, stream: false, think: false, ...(json && { format: 'json' }),
    options: { num_ctx: numCtx, num_predict: numPredict },
  }
  const res = await postOllama(http, { url: `${ollamaOrigin(env)}/api/generate`, body, signal }, provider)
  checkReply(res, model, numCtx, provider)
  return stripThink(typeof res.body?.response === 'string' ? res.body.response : '')
}
