// A model may wrap the object it was told to return in prose or a fence
// despite the instruction. This digs out the outermost {...} and parses it,
// and returns null rather than throwing so the caller can report an unreadable
// reply as exactly that instead of as a crash.
//
// The last closing brace is usually the object's own. When prose after the
// object holds a brace of its own, the span to it does not parse, so the
// braces before it are tried too, nearest the end first, a bounded number of
// times so a long reply full of braces cannot turn into a long loop.
const MAX_TRIES = 20

export function parseJsonObject(raw) {
  const text = String(raw || '')
  const start = text.indexOf('{')
  if (start === -1) return null
  let end = text.lastIndexOf('}')
  for (let tries = 0; end > start && tries < MAX_TRIES; tries += 1) {
    try {
      return JSON.parse(text.slice(start, end + 1))
    } catch {
      end = text.lastIndexOf('}', end - 1)
    }
  }
  return null
}
