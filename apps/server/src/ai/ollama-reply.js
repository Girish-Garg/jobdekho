import { ProviderError } from './errors.js'

// How an answer from Ollama's /api/generate or /api/chat is read before its
// text is: a plain request (ollama-request.js) and every turn of a web call
// (ollama-web.js) fail the same ways.
//
// A model removed since detection listed it is a 404 naming it, which is a
// missing install as far as the person is concerned. A reply that stopped
// at its cap was cut off, and a feature would only call it unreadable.
export function checkReply({ status, body }, model, numCtx, provider) {
  if (status === 404) {
    throw new ProviderError('not_found', provider,
      `Ollama no longer has the model "${model.id}". Pick another in Settings, or run "ollama pull ${model.id}" in a terminal.`)
  }
  if (status !== 200) throw new ProviderError('failed', provider, String(body?.error || `Ollama answered with status ${status}`).slice(0, 200))
  if (body?.done_reason === 'length') {
    throw new ProviderError('failed', provider, `the reply filled the ${numCtx}-token context it was given and was cut off`)
  }
}

// Said before anything is sent, when the prompt leaves the model too little
// room to answer in (see ollama-context.js).
export const tooLong = (model, tokens) => `this request is about ${tokens} tokens, too long for "${model.id}" to read and answer `
  + `(it holds ${model.contextLength}); pick a model with a longer context in Settings`
