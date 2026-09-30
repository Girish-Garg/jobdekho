import { parseJsonObject } from './loose-json.js'

// Every web caller asks for sources "you actually read or that your search
// results cited" (chat/web-prompt.js, actions/fake-check-prompt.js). A CLI
// runs its own tools, so its word is all there is; for Ollama, JobDekho ran
// every search and fetch itself and knows exactly which pages came back. A
// small local model cites pages it never saw (measured: qwen3:8b, asked for
// Ollama's website without searching, cited jobdekho.com), so any "sources"
// list in the reply, at whatever depth the caller's shape puts it, keeps
// only the pages that did come back.
const bare = (url) => String(url).trim().replace(/\/+$/, '')

function prune(value, seen) {
  if (Array.isArray(value)) return value.map((v) => prune(v, seen))
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, v]) => [
    key,
    key === 'sources' && Array.isArray(v) ? v.filter((url) => typeof url === 'string' && seen.has(bare(url))) : prune(v, seen),
  ]))
}

// A reply that is not one JSON object is handed back as it is: the caller
// decides what prose means (see chat/web-parse.js).
export function keepSeenSources(text, urls) {
  const obj = parseJsonObject(text)
  if (!obj) return text
  return JSON.stringify(prune(obj, new Set(urls.map(bare))))
}
