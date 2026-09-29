// What each tag leaves behind once it is gone. Turning every tag into a space,
// as stripHtml once did, stored all 2612 bodies as one paragraph: not a single
// line break survived, so the pane showed headings, bullets and paragraphs as
// one wall. Block tags now leave line breaks, which is the only structure a
// plain-text field can carry, and every reader downstream copes with a newline.

// A blank line: these separate one paragraph, list or heading from the next.
const PARAGRAPH = new Set([
  'p', 'div', 'ul', 'ol', 'dl', 'section', 'article', 'header', 'footer', 'table', 'blockquote',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
])

// A single line break: a new line inside the same block.
const LINE = new Set(['br', 'tr', 'hr', 'dt', 'dd'])

export function tagBreak(name, closing) {
  const tag = name.toLowerCase()
  // "- " rather than a bullet character: it is what a person types, and it
  // survives every reader of the text, the AI prompts included, unchanged.
  // Only the opening tag breaks the line; the next item or the list's own
  // close ends it.
  if (tag === 'li') return closing ? ' ' : '\n- '
  if (PARAGRAPH.has(tag)) return '\n\n'
  if (LINE.has(tag)) return '\n'
  // Inline tags (strong, em, a, span) sit inside a sentence. A space rather
  // than nothing, so "<b>Python</b>and" still reads as two words to the
  // skill matcher.
  return ' '
}

// Spaces collapse within a line and never across one, and at most one blank
// line survives in a row.
//
// <li><p>text</p></li> is how Greenhouse writes most list items. It leaves the
// bullet alone on its line with the text a paragraph below, and a blank line
// between items. The dangling marker is joined to the text that follows it,
// an empty <li> leaves nothing, and a list stays one list.
//
// The space an inline tag leaves before punctuation ("<b>Ownership</b>.") is
// dropped only where the punctuation ends a word, so ".NET" keeps its space.
export function layoutLines(text) {
  return text
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/ +([.,;:!?])(?=\s|$)/g, '$1')
    .replace(/^(?:-\n+)+(?=\S)/gm, '- ')
    .replace(/^- (?:- )+/gm, '- ')
    .replace(/^-$/gm, '')
    .replace(/^(- .*)\n\n+(?=- )/gm, '$1\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
