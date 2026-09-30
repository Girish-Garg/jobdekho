import { SEARCH_PATH } from './ollama-web-tools.js'

// Whether Ollama can search the web right now, found without searching.
// Ollama's docs (docs.ollama.com/capabilities/web-search) describe web search
// as ollama.com's API behind an API key; the local server also carries it,
// at /api/experimental/web_search and /web_fetch, signing each request with
// the key `ollama signin` registered (server/routes.go and cloud_proxy.go in
// Ollama's source), so JobDekho never holds a key. Measured on 0.32.12:
// signed out, that search answers 401 "Unauthorized" and /api/me 401;
// signed in, /api/me answers 200 and the search its results (once a 502,
// which the next search did not repeat, so ollama-web-tools.js hands such a
// failure to the model rather than ending the call).
//
// Asked in order of cost, stopping at the first thing missing, each answered
// by the one line Settings shows on Ollama's card to turn it on:
//   a model that uses tools, since the search is a tool call (from /api/tags)
//   the route itself: an empty POST answers 400 "missing request body" before
//     anything is sent to ollama.com, where a version without it answers 404
//   cloud features on (/api/status), which Ollama's settings can turn off
//   signed in: /api/me asks ollama.com who the key belongs to, 200 or 401;
//     only the status is read, never the account it names
const HINT = {
  tools: 'Pull a model that can use tools, such as "ollama pull qwen3:4b", to let Ollama search the web.',
  route: 'Update Ollama to let it search the web; this version has no web search.',
  cloud: 'Turn Ollama\'s cloud features back on to let it search the web; its searches go through ollama.com.',
  signin: 'Sign in with "ollama signin" in a terminal to let Ollama search the web; it needs a free ollama.com account.',
  offline: 'Ollama cannot search the web right now: ollama.com, which its searches go through, did not answer.',
}

const WITHOUT = (hint) => ({ policies: ['none'], webHint: HINT[hint] })

// ollama.com not answering says nothing about the next minute, so a memo
// does not keep it (see web-status-memo.js).
export const settled = (status) => status.webHint !== HINT.offline
const WITH = { policies: ['none', 'web'], webHint: null }

// `ask(method, path)` -> the response, or null when the request failed; no
// request here carries a body.
export async function probeOllamaWeb({ models, ask }) {
  if (!models.some((m) => m.tools)) return WITHOUT('tools')
  const [route, status] = await Promise.all([ask('POST', SEARCH_PATH), ask('GET', '/api/status')])
  if (route?.status !== 400) return WITHOUT('route')
  if (status?.body?.cloud?.disabled === true) return WITHOUT('cloud')
  const me = await ask('POST', '/api/me')
  if (me?.status === 200) return WITH
  return WITHOUT(me?.status === 401 ? 'signin' : 'offline')
}
