import { parseJsonObject } from '../ai/loose-json.js'
import { MEMORY_SCOPES, MAX_MEMORY_TEXT, cleanMemoryText, memoryKey } from '@jobdekho/store/memory.js'

// At most this many a turn: a message that seems to hold more than three
// lasting preferences is more likely one the model read too much into.
const MAX_SUGGESTIONS = 3

// A quote shorter than this ("I", "no") is in almost any message and proves
// nothing about where the line came from.
const MIN_QUOTE = 4

// Case, spacing and curly quotes aside, the words as the person typed them:
// a model copying a curly apostrophe tends to write a straight one.
const flat = (value) => cleanMemoryText(value).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"')

// What the model offered to remember ("memory" in its reply, see
// memory-prompt.js), kept only when it traces back to the person's own
// message: its "quote" has to be in that message. That is the whole of a
// memory's authority to be written. Nothing the model read (a posting, a web
// result, a document, the saved preferences themselves) can become one,
// since none of it is in the message.
//
// Also dropped: anything past the third, one with no text or a text too
// long to keep, and one that says what a saved preference, or an earlier
// suggestion this turn, already says. An unknown scope reads as everywhere,
// and a `replaces` that names no saved preference is left out.
//
//   [{ text, scope, quote, replaces?, replacedText? }]
export function memorySuggestions(raw, { message, items }) {
  const offered = parseJsonObject(raw)?.memory
  if (!Array.isArray(offered)) return []
  const said = flat(message)
  const known = new Set(items.map((item) => memoryKey(item.text)))
  const out = []
  for (const entry of offered) {
    if (out.length >= MAX_SUGGESTIONS) break
    const text = cleanMemoryText(entry?.text)
    const quote = cleanMemoryText(entry?.quote)
    if (!text || text.length > MAX_MEMORY_TEXT || known.has(memoryKey(text))) continue
    if (quote.length < MIN_QUOTE || !said.includes(flat(quote))) continue
    known.add(memoryKey(text))
    const old = items.find((item) => item.id === entry.replaces)
    const scope = MEMORY_SCOPES.includes(entry.scope) ? entry.scope : 'everywhere'
    out.push({ text, scope, quote, ...(old ? { replaces: old.id, replacedText: old.text } : {}) })
  }
  return out
}
