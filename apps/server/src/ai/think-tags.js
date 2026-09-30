// Reasoning models write their thinking out before the answer, between
// <think> tags. A template that opens the tag itself leaves only the closing
// one in the reply: measured on `ollama run` with a Qwen 3.5 fine-tune, the
// reply began mid-thought and the answer followed a bare "</think>". Neither
// kind of thinking is part of the answer, and it can hold braces of its own
// that would send loose-json.js's search for the object astray.
const BLOCK = /<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi
const CLOSE = /<\/think(?:ing)?>/gi
const OPEN = /<think(?:ing)?>/i

// Whole blocks go first. A closing tag left after that closes thinking whose
// opening was in the template, so everything before it goes too. An opening
// tag left after that is thinking that never finished, a reply cut off
// mid-thought, so nothing from it on is an answer.
export function stripThink(text) {
  let out = String(text ?? '').replace(BLOCK, '')
  const last = [...out.matchAll(CLOSE)].at(-1)
  if (last) out = out.slice(last.index + last[0].length)
  const open = out.search(OPEN)
  if (open !== -1) out = out.slice(0, open)
  return out.trim()
}
