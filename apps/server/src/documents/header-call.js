import { scanTex } from '../resume/guard/scan.js'

// Where a document's header sits: the first real call of one of the macros
// JobDekho's templates write the person's name and contact line with, and
// the source offsets of each of its arguments, so profile-header.js can swap
// one argument without moving a byte around it.
//
// Read with the LaTeX guard's own tokenizer (see resume/guard/scan.js),
// which is what makes the edge cases come out the way TeX reads them: a call
// inside a % comment is no call, \{ and \} are characters rather than
// braces, a control word runs to its last letter (so \resHeaderLine is never
// \resHeader), and a link's address is one token whatever it holds.

// Commands that define a macro rather than call it: in "\def\resHeader{...}"
// the braces are its body, not its arguments. The templates' own
// "\newcommand{\resHeader}[3]" is passed over without this, since the name
// there is followed by a closing brace, and a call only ever by an opening
// one; this catches the forms that leave the braces off the name.
const DEFINERS = new Set(['def', 'gdef', 'edef', 'xdef', 'let', 'newcommand', 'renewcommand', 'providecommand'])
const SPACE = /\s/

const isChar = (token, ch) => token?.type === 'char' && token.ch === ch

// TeX passes over spaces and line ends before an undelimited argument, so
// a header split over lines is still one call.
function skipSpace(tokens, k) {
  let j = k
  while (tokens[j]?.type === 'char' && SPACE.test(tokens[j].ch)) j += 1
  return j
}

// The brace group opening at tokens[k] as source offsets (start just inside
// its "{", end at its matching "}"), or null when there is no group there or
// it never closes.
function readGroup(tex, tokens, k) {
  if (!isChar(tokens[k], '{')) return null
  let depth = 0
  for (let j = k; j < tokens.length; j += 1) {
    if (isChar(tokens[j], '{')) depth += 1
    else if (isChar(tokens[j], '}') && (depth -= 1) === 0) {
      const start = tokens[k].at + 1
      return { start, end: tokens[j].at, text: tex.slice(start, tokens[j].at), next: j + 1 }
    }
  }
  return null
}

function readArgs(tex, tokens, k, count) {
  const args = []
  let j = k
  for (let n = 0; n < count; n += 1) {
    const group = readGroup(tex, tokens, skipSpace(tokens, j))
    if (!group) return null
    args.push({ start: group.start, end: group.end, text: group.text })
    j = group.next
  }
  return args
}

const isCall = (tokens, k, arity) => {
  const token = tokens[k]
  if (token.type !== 'cs' || !Object.hasOwn(arity, token.name)) return false
  if (tokens[k - 1]?.type === 'cs' && DEFINERS.has(tokens[k - 1].name)) return false
  return isChar(tokens[skipSpace(tokens, k + 1)], '{')
}

// `arity` names each header macro with its number of arguments. Returns
// { macro, args: [{ start, end, text }] }, or null when there is no call, or
// the first one does not have all its arguments (the person rewrote it, and
// guessing at what they meant would be worse than leaving it alone).
export function findHeaderCall(tex, arity) {
  const text = String(tex ?? '')
  const tokens = scanTex(text)
  const k = tokens.findIndex((_, i) => isCall(tokens, i, arity))
  if (k === -1) return null
  const args = readArgs(text, tokens, k + 1, arity[tokens[k].name])
  return args ? { macro: tokens[k].name, args } : null
}
