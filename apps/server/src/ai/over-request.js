import { timedOut } from './errors.js'

// The way a provider with a request hook is asked (Ollama, see providers.js):
// no process and no directory, the prompt handed to the provider's own local
// API. The call's timeout is an abort signal the hook passes on, so a reply
// that takes too long is dropped the way a CLI past its timeout is killed,
// and reported in the same words. Dropping the connection is also what
// tells Ollama to stop generating.
export async function overRequest({ provider, prompt, tools, json, timeoutMs, http }) {
  const signal = AbortSignal.timeout(timeoutMs)
  try {
    return await provider.request({ prompt, tools, json, model: provider.model, signal, http }, provider)
  } catch (err) {
    if (signal.aborted) throw timedOut(provider, timeoutMs)
    throw err
  }
}
