import { underPolicies } from './policies.js'
import { probeOllama } from './ollama-probe.js'
import { requestOllama } from './ollama-request.js'

// Ollama runs a model on this computer, so the prompt never leaves it. Its
// entry lives here rather than beside the other two in providers.js only for
// length; providers.js documents every field and lists it.
//
// It has no web search JobDekho could hand it, so it honours 'none' alone:
// select.js never gives it "Is this job real?" or the chat's search, however
// it is preferred. Nothing is passed on a command line either way, hence the
// empty argument lists: they only say which policies it honours.
//
// It is asked over its local HTTP API (ollama-request.js) rather than through
// `ollama run`, which has no flag for the context size. Measured on 0.32.12:
// `ollama run` cut a 12,000-token prompt to its 4,096-token default and
// answered a question the prompt never asked, where the API with the context
// sized to the prompt read all of it and answered right. There is nothing to
// sign in to, so it has no login wording.
//
// A local model is slower than a hosted one, and slower still on a machine
// without a graphics card, so its calls get three times the feature's own
// timeout. When nothing at all is installed it is offered in a sentence of
// its own, because installing it is not enough: it needs a model pulled too.
export const OLLAMA = {
  id: 'ollama',
  label: 'Ollama',
  binary: 'ollama',
  install: 'https://ollama.com',
  ...underPolicies({ base: [], byPolicy: { none: [] } }),
  probe: probeOllama,
  request: requestOllama,
  timeoutScale: 3,
  offer: 'To run the AI on this computer instead, install Ollama from https://ollama.com, '
    + 'pull a model with "ollama pull llama3.2", then restart JobDekho.',
}
