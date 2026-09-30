import { underPolicies } from './policies.js'
import { probeOllama } from './ollama-probe.js'
import { requestOllama } from './ollama-request.js'

// Ollama runs a model on this computer, so the prompt never leaves it. Its
// entry lives here rather than beside the other two in providers.js only for
// length; providers.js documents the fields every entry shares.
//
// It is asked over its local HTTP API (ollama-request.js) rather than through
// `ollama run`, which has no flag for the context size. Measured on 0.32.12:
// `ollama run` cut a 12,000-token prompt to its 4,096-token default and
// answered a question the prompt never asked, where the API with the context
// sized to the prompt read all of it and answered right. Nothing is passed on
// a command line, hence the empty argument lists: they only say which
// policies it can honour.
//
// 'web' only on a machine where it can search right now, which its probe
// decides (see ollama-web-probe.js): the searches go through the local
// server's own proxy to ollama.com, signed with the person's `ollama signin`,
// so JobDekho holds no key. Until the probe has said so, 'none' alone. The
// model then runs here and only its search queries and the pages it opens go
// out (see ollama-web.js).
//
// A local model is slower than a hosted one, and slower still on a machine
// without a graphics card, so its calls get three times the feature's own
// timeout. When nothing at all is installed it is offered in a sentence of
// its own, because installing it is not enough: it needs a model pulled too.
//
//   policiesUnprobed  what detection reports before the probe has run
//   probe             ({ http }) -> { runs, version, error, models, policies,
//                     webHint }, in place of the version probe once the
//                     binary is found (see ollama-probe.js)
//   request           ({ prompt, tools, json, model, signal, http }, provider)
//                     -> the model's text; the call goes to a local API, so
//                     there is nothing to spawn or encode (see call.js)
//   canUse            (model, policy) -> whether that model can take a call
//                     under that policy: a web call needs one that uses tools
//   signin            the command that signs it in, named when it is not
//   local             it runs on this computer, which Settings says
//   timeoutScale      how many times the feature's own timeout it gets
//   offer             the sentence offering it when nothing is installed
export const OLLAMA = {
  id: 'ollama',
  label: 'Ollama',
  binary: 'ollama',
  install: 'https://ollama.com',
  ...underPolicies({ base: [], byPolicy: { none: [], web: [] } }),
  policiesUnprobed: ['none'],
  probe: probeOllama,
  request: requestOllama,
  canUse: (model, policy) => policy !== 'web' || model.tools === true,
  signin: 'ollama signin',
  local: true,
  timeoutScale: 3,
  offer: 'To run the AI on this computer instead, install Ollama from https://ollama.com, '
    + 'pull a model with "ollama pull llama3.2", then restart JobDekho.',
}
