// The only two tools an Ollama web call is handed, and how each is run. The
// model does not run them: /api/chat hands back the calls it wants and this
// file runs them against the local server's proxy to ollama.com (see
// ollama-web-probe.js), so this table is the whole of what can run. A call to
// anything else is answered "not available" and nothing is sent anywhere.
export const SEARCH_PATH = '/api/experimental/web_search'
export const FETCH_PATH = '/api/experimental/web_fetch'

// A result is cut to this before the model reads it, the way Ollama's own
// example cuts them (8,000 characters); a little less, so the eight results
// ollama-web.js allows fit the context it sizes.
export const RESULT_CHARS = 6000
const MAX_RESULTS = 5
const MAX_QUERY = 300
const MAX_URL = 2000

const fn = (name, description, properties, required) => ({
  type: 'function', function: { name, description, parameters: { type: 'object', properties, required } },
})

export const WEB_TOOLS = [
  fn('web_search', 'Search the web. Returns the top results, each with its title, url and a passage of its text.', {
    query: { type: 'string', description: 'What to search for' },
    max_results: { type: 'integer', description: `How many results, 1 to ${MAX_RESULTS}` },
  }, ['query']),
  fn('web_fetch', 'Open one web page by its address and read its main text.', {
    url: { type: 'string', description: 'The http or https address of the page' },
  }, ['url']),
]

const clip = (value) => JSON.stringify(value).slice(0, RESULT_CHARS)
const isWebAddress = (url) => /^https?:\/\/[^\s/]+/i.test(url) && url.length <= MAX_URL

// Each tool: its arguments checked, the request to make, what of the answer
// the model reads, and the pages it saw, the only ones it may cite (see
// ollama-web-sources.js). Anything else in an answer, such as a page's list
// of links, stays out of the context.
const RUN = {
  web_search: ({ query, max_results: max }) => {
    const text = typeof query === 'string' ? query.trim() : ''
    if (!text || text.length > MAX_QUERY) return { refused: `web_search needs a query of 1 to ${MAX_QUERY} characters.` }
    const count = Math.min(Math.max(Math.trunc(Number(max)) || MAX_RESULTS, 1), MAX_RESULTS)
    const results = (b) => (Array.isArray(b?.results) ? b.results : [])
    return {
      path: SEARCH_PATH, body: { query: text, max_results: count },
      read: (b) => clip(results(b)), urls: (b) => results(b).map((r) => r?.url),
    }
  },
  web_fetch: ({ url }) => {
    const address = typeof url === 'string' ? url.trim() : ''
    if (!isWebAddress(address)) return { refused: 'web_fetch needs one http or https address.' }
    return {
      path: FETCH_PATH, body: { url: address },
      read: (b) => clip({ url: address, title: b?.title, content: b?.content }), urls: () => [address],
    }
  },
}

// Arguments arrive as an object from Ollama; a model that writes them as a
// JSON string is read the same way.
function argsOf(call) {
  const raw = call?.function?.arguments
  if (typeof raw !== 'string') return raw && typeof raw === 'object' ? raw : {}
  try {
    return JSON.parse(raw) ?? {}
  } catch {
    return {}
  }
}

// -> { name, content, sent, urls }: the tool message's text, whether a
// request went out, and the pages that came back. `post(path, body)` makes
// the request and throws a ProviderError for a failure the whole call should
// stop on; any other failure is the tool's answer, so the model can answer
// from what it has.
export async function runWebTool(call, post) {
  const name = String(call?.function?.name ?? '')
  const plan = Object.hasOwn(RUN, name) ? RUN[name](argsOf(call)) : { refused: `${name || 'That tool'} is not available. Use web_search or web_fetch.` }
  if (plan.refused) return { name, content: plan.refused, sent: false, urls: [] }
  const res = await post(plan.path, plan.body)
  if (res.status !== 200) return { name, content: `${name} failed: ${String(res.body?.error || `status ${res.status}`).slice(0, 200)}`, sent: true, urls: [] }
  return { name, content: plan.read(res.body), sent: true, urls: plan.urls(res.body).filter((u) => typeof u === 'string') }
}
