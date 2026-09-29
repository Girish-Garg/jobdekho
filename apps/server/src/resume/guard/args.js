// Reading a command's arguments out of the token list (see scan.js). Braces
// are counted as TeX counts them: an escaped \{ is a control symbol, not a
// brace, and a brace inside a comment was never tokenized at all.
const isSpace = (token) => token?.type === 'char' && /\s/.test(token.ch)
export const isChar = (token, ch) => token?.type === 'char' && token.ch === ch

// Spaces, and with `star` the * of \newcommand* or \section*.
export function skipBlank(tokens, k, { star = false } = {}) {
  let j = k
  while (isSpace(tokens[j]) || (star && isChar(tokens[j], '*'))) j += 1
  return j
}

export const textOf = (tokens) => tokens.map((t) => {
  if (t.type === 'cs') return `\\${t.name}`
  if (t.type === 'url') return `{${t.raw ?? ''}}`
  return t.ch
}).join('')

// A group from an opening `open` at k to its matching `close` at brace depth
// zero. An unclosed group runs to the end, which TeX would report as an
// error anyway; reading it whole means nothing inside escapes the checks.
function readDelimited(tokens, k, open, close) {
  if (!isChar(tokens[k], open)) return null
  let depth = 0
  for (let j = k + 1; j < tokens.length; j += 1) {
    if (isChar(tokens[j], '{')) depth += 1
    else if (isChar(tokens[j], '}') && depth > 0) depth -= 1
    else if (isChar(tokens[j], close) && depth === 0) {
      const inner = tokens.slice(k + 1, j)
      return { inner, text: textOf(inner), next: j + 1 }
    }
  }
  const inner = tokens.slice(k + 1)
  return { inner, text: textOf(inner), next: tokens.length }
}

export const readBrace = (tokens, k) => readDelimited(tokens, k, '{', '}')
export const readBracket = (tokens, k) => readDelimited(tokens, k, '[', ']')

// The argument of the command at k: an optional [..] and then {..}, as
// \usepackage[T1]{fontenc} and \documentclass[11pt]{article} take them.
export function readArgument(tokens, k) {
  let j = skipBlank(tokens, k + 1, { star: true })
  const option = readBracket(tokens, j)
  if (option) j = skipBlank(tokens, option.next)
  return { option: option?.text ?? null, group: readBrace(tokens, j) }
}
