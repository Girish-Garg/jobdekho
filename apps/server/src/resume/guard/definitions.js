import { isChar, readBrace, skipBlank } from './args.js'

// The names a document defines for itself, which it may then use like any
// allowed command. This is safe because of what it does NOT allow:
//
//   - A definition's body is ordinary text to this check, read and checked
//     token by token like the rest, so a new name can only ever stand for
//     commands that were allowed anyway.
//   - A refused name stays refused even when defined (see denied.js), since
//     \providecommand{\openin}{} leaves the primitive in place.
//   - A name counts as the document's own only AFTER the command that
//     defines it. Before that point it still means whatever TeX or LaTeX
//     meant by it, so "\x{..} ... \renewcommand{\x}{..}" would run the
//     original \x first.
//   - Only \newcommand and its relatives count. \def and \let are refused,
//     so there is no way to give a name a meaning this check did not read.
//
// Each map holds a name and the index of the first token that defines it.
const COMMAND_DEFINERS = new Set(['newcommand', 'renewcommand', 'providecommand', 'newlength'])
const ENVIRONMENT_DEFINERS = new Set(['newenvironment', 'renewenvironment', 'newlist'])

// \newcommand\name, \newcommand{\name} and \newcommand*{\name} all name the
// same thing; a name that is not a plain control word defines nothing here.
function definedName(tokens, k) {
  let j = skipBlank(tokens, k + 1, { star: true })
  if (isChar(tokens[j], '{')) j = skipBlank(tokens, j + 1)
  const token = tokens[j]
  return token?.type === 'cs' && /^[A-Za-z]+$/.test(token.name) ? token.name : null
}

function groupText(tokens, k) {
  const group = readBrace(tokens, skipBlank(tokens, k + 1, { star: true }))
  return group ? group.text.trim() : ''
}

const remember = (map, name, k) => { if (name && !map.has(name)) map.set(name, k) }

export function collectDefinitions(tokens) {
  const commands = new Map()
  const environments = new Map()
  tokens.forEach((token, k) => {
    if (token.type !== 'cs') return
    if (COMMAND_DEFINERS.has(token.name)) remember(commands, definedName(tokens, k), k)
    else if (ENVIRONMENT_DEFINERS.has(token.name)) remember(environments, groupText(tokens, k), k)
    else if (token.name === 'newcounter') {
      // A counter brings its own \the<name> for printing it.
      const name = groupText(tokens, k)
      if (/^[A-Za-z]+$/.test(name)) remember(commands, `the${name}`, k)
    }
  })
  return { commands, environments }
}

// Whether `name` is the document's own at token index `k`.
export const definedBefore = (map, name, k) => map.has(name) && map.get(name) < k
