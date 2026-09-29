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
