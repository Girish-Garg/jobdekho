// The line a fact-check flag sits in, so the person can find it in the
// rewrite without searching. A line is the unit of an ATS-plain resume (one
// fact per bullet), and it is the sentence the flag is about far more often
// than a period-split piece would be: "Jul 2023 to Present" has no period,
// and "Node.js" has one that is not a sentence end.
const MAX_CONTEXT = 240

export function contextAt(text, index) {
  const start = index > 0 ? text.lastIndexOf('\n', index - 1) + 1 : 0
  const stop = text.indexOf('\n', index)
  const line = text.slice(start, stop === -1 ? text.length : stop).replace(/^[\s\-*•]+/, '').trim()
  if (line.length <= MAX_CONTEXT) return line
  // A very long line is cut around the flag rather than at its head, so the
  // flagged value is always inside what is shown.
  const at = Math.max(0, index - start - MAX_CONTEXT / 2)
  return `${at > 0 ? '...' : ''}${line.slice(at, at + MAX_CONTEXT).trim()}...`
}
