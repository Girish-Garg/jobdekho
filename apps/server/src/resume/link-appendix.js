// The resume's links, written for the AI as a list after the resume text,
// since the text layer it reads has the words of a link but never its
// address (see link-pairs.js).
export const LINKS_HEADING = 'LINKS IN THE RESUME (visible text -> address):'

// A resume has a handful of links. The cap is for the odd PDF that carries
// hundreds of boxes, a table of contents say, so they cannot swamp the prompt.
const MAX_LINKS = 50

// A link whose visible text is its own address ("demo@example.com",
// "github.com/demo") is already readable in the resume text, in the entry it
// belongs to, so listing it again would add a line and say nothing new.
const bare = (s) => String(s).toLowerCase()
  .replace(/^(https?:\/\/|mailto:|tel:)/, '').replace(/^www\./, '')
  .replace(/[\s()-]/g, '').replace(/\/+$/, '')
const writtenOut = ({ text, url }) => Boolean(text) && bare(text) === bare(url)

function describe({ text, url, line }) {
  const where = line && line !== text ? ` (on the line: ${line})` : ''
  return `${text || '(no visible text)'} -> ${url}${where}`
}

// [{ text, url, line }] to the block that follows the resume text, or '' when
// there is nothing to add, so a resume with no links reads exactly as before.
export function linkAppendix(pairs) {
  const seen = new Set()
  const lines = []
  for (const pair of Array.isArray(pairs) ? pairs : []) {
    const key = `${pair.text}\n${pair.url}`
    if (!pair.url || writtenOut(pair) || seen.has(key)) continue
    seen.add(key)
    lines.push(describe(pair))
  }
  return lines.length ? `\n\n${LINKS_HEADING}\n${lines.slice(0, MAX_LINKS).join('\n')}\n` : ''
}
