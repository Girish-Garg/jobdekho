import { httpJson } from './http-json.js'
import { ollamaOrigin, NOT_RUNNING } from './ollama-origin.js'

// Ollama's detection, in place of a version probe (see detect.js, which has
// already found the binary on PATH before this is asked). Two reads of the
// local server, neither of which runs a model: /api/version says it is up,
// /api/tags lists what is installed. It runs only with a model to run, so a
// server with none is reported the way a CLI that will not start is.
const PROBE_TIMEOUT_MS = 5000

const NO_MODELS = 'Ollama has no models yet: run "ollama pull llama3.2" in a terminal, then check again.'
const ONLY_CLOUD = 'Ollama has no models on this computer yet, only cloud ones, which send the prompt to ollama.com, '
  + 'so JobDekho leaves them out: run "ollama pull llama3.2" in a terminal, then check again.'

// A cloud model is listed beside the local ones but runs on ollama.com, so
// the resume would leave the machine; /api/tags marks one with remote_host
// or remote_model, and its name ends in "cloud". An embedding model cannot
// write a reply, and says so by lacking "completion" among its capabilities,
// where this version of Ollama reports them.
const remote = (m) => Boolean(m.remote_host || m.remote_model) || /[-:]cloud$/i.test(m.name)
const writes = (m) => !Array.isArray(m.capabilities) || m.capabilities.includes('completion')

// What the Settings screen offers and select.js binds a call to: the name
// Ollama knows the model by, its size on disk in bytes, and the most context
// it can take, when Ollama says.
function localModels(list) {
  const named = (Array.isArray(list) ? list : []).filter((m) => typeof m?.name === 'string' && m.name)
  const local = named.filter((m) => !remote(m) && writes(m))
  const models = local.map((m) => ({
    name: m.name,
    size: Number(m.size) || null,
    contextLength: Number(m.details?.context_length) || null,
  }))
  return { models, onlyCloud: !models.length && named.some(remote) }
}

export async function probeOllama({ http = httpJson, env = process.env } = {}) {
  const origin = ollamaOrigin(env)
  const get = (path) => http({ url: `${origin}${path}`, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) })
  let version
  let tags
  try {
    [version, tags] = await Promise.all([get('/api/version'), get('/api/tags')])
  } catch {
    return { runs: false, version: null, models: [], error: NOT_RUNNING }
  }
  // Something else on Ollama's port answers, but not as Ollama would.
  if (tags.status !== 200) return { runs: false, version: null, models: [], error: NOT_RUNNING }
  const found = typeof version.body?.version === 'string' ? version.body.version : null
  const { models, onlyCloud } = localModels(tags.body?.models)
  if (!models.length) return { runs: false, version: found, models, error: onlyCloud ? ONLY_CLOUD : NO_MODELS }
  return { runs: true, version: found, models, error: null }
}
