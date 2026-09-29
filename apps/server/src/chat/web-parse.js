import { parseJsonObject } from '../ai/loose-json.js'
import { isSourceLink } from '../actions/http-link.js'

// The same ceiling as a plain chat answer (see parse.js), and a handful of
// sources: enough to check a claim, not a reading list.
const MAX_REPLY = 4000
const MAX_SOURCES = 6
const LINK_IN_TEXT = /https?:\/\/[^\s)\]"'<>]+/g

// Safe links to the pages themselves (see http-link.js), each once.
const sourcesOf = (list) => [...new Set(list.filter(isSourceLink))].slice(0, MAX_SOURCES)

// Null when there is nothing to show, which the caller reports as an
// unreadable reply. Sources come back as a list, empty when the model cited
// nothing but search redirects or links a browser should not open.
export function parseChatWebReply(raw) {
  const obj = parseJsonObject(raw)
  const reply = typeof obj?.reply === 'string' ? obj.reply.trim().slice(0, MAX_REPLY) : ''
  if (reply) return { reply, sources: sourcesOf(Array.isArray(obj.sources) ? obj.sources : []) }
  return obj ? null : prose(raw)
}

// After a few searches a model sometimes drops the JSON and answers in plain
// prose. That is still the answer to the question, so it is shown as it is,
// with the links it mentions as its sources. Measured once on Claude Code,
// in a run whose reply was not kept; five reruns all came back as JSON.
function prose(raw) {
  const text = String(raw || '').trim()
  if (!text) return null
  return { reply: text.slice(0, MAX_REPLY), sources: sourcesOf(text.match(LINK_IN_TEXT) ?? []) }
}
