// A model may wrap the object it was told to return in prose or a fence
// despite the instruction. This digs out the outermost {...} and parses it,
// and returns null rather than throwing so the caller can report an unreadable
// reply as exactly that instead of as a crash.
export function parseJsonObject(raw) {
  const text = String(raw || '')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}
