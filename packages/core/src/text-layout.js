// A description's line breaks are the structure left once its HTML is gone:
// paragraphs, list items, headings (see packages/sources/src/html.js). This
// used to collapse every run of whitespace to one space, which flattened all
// 2612 stored bodies into a single line whatever the board had sent. Spaces
// now collapse within a line and never across one, and at most one blank
// line survives in a row. The sources package does the same after its own
// HTML pass; this one also covers boards that send plain text.
export function tidyLines(text) {
  return String(text || '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// The snippet is a one-line preview: a card, the pane's first paint, and the
// keyword filter all read it as a line of prose.
export function oneLine(text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

// The sentence a match sits in, cut at a line or a sentence end, for a tag's
// evidence: a person checks a tag against the words that made it. A
// sentence ends before a capital, never at an abbreviation: "a fee of Rs.
// 1,500" is one sentence.
const SENTENCE_END = /[.!?]+\s+(?=[A-Z"'(‘“])/g
const ABBREVIATION = /\b(?:rs|no|mr|ms|mrs|dr|sr|jr|st|vs|etc|approx|min|max|incl|dept|inc|ltd|co|e\.g|i\.e)\.$/i

export function sentenceAt(text, index) {
  const lineStart = text.lastIndexOf('\n', Math.max(0, index - 1)) + 1
  const lineEnd = text.indexOf('\n', index)
  const line = text.slice(lineStart, lineEnd < 0 ? text.length : lineEnd)
  const at = index - lineStart
  let start = 0
  let end = line.length
  for (const m of line.matchAll(SENTENCE_END)) {
    const stop = m.index + m[0].trimEnd().length
    if (ABBREVIATION.test(line.slice(0, stop))) continue
    if (stop <= at) start = m.index + m[0].length
    else {
      end = stop
      break
    }
  }
  return line.slice(start, end).trim()
}

const flatLength = (text) => oneLine(text.replace(/^- /gm, '')).length

// The stored body's budget was set on flat text. Spent on line breaks and
// "- " markers too, it held about 2% fewer words, and on a re-derived sample
// of 1562 live postings 14 lost a skill that sat just inside the old cut. So
// layout does not spend it: the cut falls where the same words end.
export function clipText(text, max) {
  if (flatLength(text) <= max) return text
  // A prefix never reads longer flat than raw, so the cut is at least max.
  let lo = max
  let hi = text.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (flatLength(text.slice(0, mid)) <= max) lo = mid
    else hi = mid - 1
  }
  return text.slice(0, lo).trimEnd()
}
