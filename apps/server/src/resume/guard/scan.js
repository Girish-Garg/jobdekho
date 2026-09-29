// Reads a .tex source the way TeX's own tokenizer does under LaTeX's
// standard character codes, which is the only reading this check can
// promise to match: everything that could change those codes (\catcode,
// \makeatletter, verbatim, ^^ notation) is refused outright, so for any
// document that passes, this reading and TeX's are the same.
//
// Tokens:
//   { type: 'cs', name, at }            a control word (\ plus letters) or
//                                       control symbol (\ plus one non-letter)
//   { type: 'char', ch, at }            any other character outside a comment
//   { type: 'url', raw, closed, at }    the address after \url or \href
//
// A control word is ASCII letters only, exactly as TeX reads one: in
// "\input2" or "\in<zero-width space>put" TeX sees \input or \in and stops
// there, and so does this.
const LETTER = /[A-Za-z]/
const INLINE_SPACE = /[ \t]/
const LINE_END = /[\r\n]/

// hyperref reads the address of these two with % and \ as ordinary
// characters, so at the top level "\url{x%}\input{y}" runs \input while a
// reader that took % for a comment would skip it. The address is therefore
// read here as hyperref reads it, up to its closing brace, and links.js
// refuses any address holding a %, a backslash or a brace, which is what
// makes both readings agree on where it ends wherever the link sits.
const URL_COMMANDS = new Set(['url', 'href'])

// TeX ends a comment at the end of its line. A lone carriage return ends a
// line for pdfTeX too, so the comment ends there as well: a check that kept
// reading "comment" after TeX had started a new line would wave through
// whatever was hidden on it. Ending early can only make the check stricter.
function endOfComment(tex, i) {
  let j = i
  while (j < tex.length && !LINE_END.test(tex[j])) j += 1
  return j
}

// A backslash at the very end of the text reads, to TeX, as one before the
// line end: a control space, named "\n" here.
function controlSequence(tex, j) {
  if (j >= tex.length) return { name: '\n', next: j }
  if (!LETTER.test(tex[j])) return { name: tex[j], next: j + 1 }
  let k = j
  while (k < tex.length && LETTER.test(tex[k])) k += 1
  return { name: tex.slice(j, k), next: k }
}

function readUrlGroup(tex, j, tokens) {
  let k = j
  while (k < tex.length && INLINE_SPACE.test(tex[k])) k += 1
  if (tex[k] !== '{') {
    tokens.push({ type: 'url', raw: null, closed: false, at: j })
    return j
  }
  const close = tex.indexOf('}', k + 1)
  const closed = close !== -1
  tokens.push({ type: 'url', raw: tex.slice(k + 1, closed ? close : tex.length), closed, at: k })
  return closed ? close + 1 : tex.length
}

export function scanTex(tex) {
  const tokens = []
  let i = 0
  while (i < tex.length) {
    const ch = tex[i]
    if (ch === '%') {
      i = endOfComment(tex, i)
    } else if (ch !== '\\') {
      tokens.push({ type: 'char', ch, at: i })
      i += 1
    } else {
      const { name, next } = controlSequence(tex, i + 1)
      tokens.push({ type: 'cs', name, at: i })
      i = URL_COMMANDS.has(name) ? readUrlGroup(tex, next, tokens) : next
    }
  }
  return tokens
}
