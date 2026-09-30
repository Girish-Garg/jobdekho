// The reply a chat answer is in the middle of writing, read out of the JSON
// object it is still inside: {"reply":"Three stand out for your Rea
//
// The chat's model answers with one object (see chat/prompt.js) whose
// "reply" string is what the panel shows, so the growing text of that string
// is what streams. Escapes are decoded as they complete; one cut in half
// waits for the rest of it, so what this returns only ever grows while the
// object does. Until the key has been written there is nothing to show.
const KEY = /"reply"\s*:\s*"/

const ESCAPES = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' }

export function partialReply(raw) {
  const text = String(raw ?? '')
  const found = KEY.exec(text)
  if (!found) return ''
  let out = ''
  for (let i = found.index + found[0].length; i < text.length; i += 1) {
    const ch = text[i]
    if (ch === '"') return out
    if (ch !== '\\') {
      out += ch
      continue
    }
    const next = text[i + 1]
    if (next === undefined) return out
    if (next === 'u') {
      const hex = text.slice(i + 2, i + 6)
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) return out
      out += String.fromCharCode(parseInt(hex, 16))
      i += 5
      continue
    }
    out += ESCAPES[next] ?? next
    i += 1
  }
  return out
}
