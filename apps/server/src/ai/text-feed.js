// What a CLI has written so far, read from its output as it arrives, for an
// answer shown while it is being written. Output comes in chunks that can
// end mid-line, so a line is read only once it is whole; `textOf` is the
// provider's reading of one line (see claude.js and agy.js), the piece of
// the model's text it carries or nothing. `onText` gets the whole text so
// far each time it grows.
export function textFeed(textOf, onText) {
  let tail = ''
  let text = ''
  return (chunk) => {
    const lines = (tail + chunk).split('\n')
    tail = lines.pop()
    const before = text.length
    for (const line of lines) text += textOf(line) || ''
    if (text.length > before) onText(text)
  }
}

// One line of a CLI's stream-json output as an object, or null for a line
// that is not one (a blank, or a warning some versions print).
export function jsonLine(line) {
  try {
    const value = JSON.parse(line)
    return value !== null && typeof value === 'object' ? value : null
  } catch {
    return null
  }
}
