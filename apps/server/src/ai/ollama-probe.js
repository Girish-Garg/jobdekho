import { httpJson } from './http-json.js'
import { ollamaOrigin, NOT_RUNNING } from './ollama-origin.js'
import { probeOllamaWeb, settled } from './ollama-web-probe.js'
import { noMemo } from './web-status-memo.js'

// Ollama's detection, in place of a version probe (see detect.js, which has
// already found the binary on PATH before this is asked). Reads of the local
// server, none of which runs a model: /api/version says it is up, /api/tags
// lists what is installed, and ollama-web-probe.js whether it can search. It
// runs only with a model to run, so a server with none is reported the way a
// CLI that will not start is.
const PROBE_TIMEOUT_MS = 5000

const NO_MODELS = 'Ollama has no models yet: run "ollama pull llama3.2" in a terminal, then check again.'
const ONLY_CLOUD = 'Ollama has no models on this computer yet, only cloud ones, which send the prompt to ollama.com, '
  + 'so JobDekho leaves them out: run "ollama pull llama3.2" in a terminal, then check again.'

// A cloud model is listed beside the local ones but runs on ollama.com, so
// the resume would leave the machine; /api/tags marks one with remote_host
// or remote_model, and its name ends in "cloud". An embedding model cannot
// write a reply, and says so by lacking "completion" among its capabilities,
// where this version of Ollama reports them; "tools" there is what a web
// call needs, since its search is a tool call.
const remote = (m) => Boolean(m.remote_host || m.remote_model) || /[-:]cloud$/i.test(m.name)
const has = (m, capability) => !Array.isArray(m.capabilities) || m.capabilities.includes(capability)

// What the Settings screen offers and select.js binds a call to: the name
// Ollama knows the model by, as both its id and its label, its size on disk
// in bytes, the most context it can take, and whether it uses tools, when
// Ollama says.
function localModels(list) {
  const named = (Array.isArray(list) ? list : []).filter((m) => typeof m?.name === 'string' && m.name)
  const local = named.filter((m) => !remote(m) && has(m, 'completion'))
  const models = local.map((m) => ({
    id: m.name,
    label: m.name,
    size: Number(m.size) || null,
    contextLength: Number(m.details?.context_length) || null,
    tools: Array.isArray(m.capabilities) && m.capabilities.includes('tools'),
  }))
  return { models, onlyCloud: !models.length && named.some(remote) }
}

const STOPPED = { runs: false, version: null, models: [], error: NOT_RUNNING, policies: ['none'], webHint: null }

// `remember` holds the web answer between detections (web-status-memo.js).
export async function probeOllama({ http = httpJson, env = process.env, remember = noMemo, refresh = false } = {}) {
  const origin = ollamaOrigin(env)
  const send = (method, path) => http({ url: `${origin}${path}`, method, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) })
  let version
  let tags
  try {
    [version, tags] = await Promise.all([send('GET', '/api/version'), send('GET', '/api/tags')])
  } catch {
    return STOPPED
  }
  // Something else on Ollama's port answers, but not as Ollama would.
  if (tags.status !== 200) return STOPPED
  const found = typeof version.body?.version === 'string' ? version.body.version : null
  const { models, onlyCloud } = localModels(tags.body?.models)
  if (!models.length) return { ...STOPPED, version: found, error: onlyCloud ? ONLY_CLOUD : NO_MODELS }
  const key = models.filter((m) => m.tools).map((m) => m.id).join(' ')
  const probe = () => probeOllamaWeb({ models, ask: (method, path) => send(method, path).catch(() => null) })
  const web = await remember(key, probe, { refresh, keep: settled })
  return { runs: true, version: found, models, error: null, ...web }
}
