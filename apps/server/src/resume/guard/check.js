import { scanTex } from './scan.js'
import { checkRaw, MAX_TEX } from './raw.js'
import { collectDefinitions, definedBefore } from './definitions.js'
import { ALLOWED_COMMANDS, ALLOWED_SYMBOLS } from './commands.js'
import { denial } from './denied.js'
import { checkPackages } from './packages.js'
import { checkEnvironments } from './environments.js'
import { checkLink } from './links.js'
import { MESSAGES } from './messages.js'

// The LaTeX guard: run on a document before EVERY compile, whoever wrote it.
//
// Why it exists: a document is no longer only escaped profile text dropped
// into a fixed template. The AI writes .tex, the prompt that steers it may
// carry scraped job text written by a stranger, and the person edits the
// source by hand. pdfTeX can read any file the person can read (\input,
// \openin with \read, \pdfximage, graphics and verbatim-input packages) and
// print it into the PDF, and that PDF is then emailed to employers. -no-
// shell-escape stops programs from running; nothing in TeX stops reading.
//
// How: the source is tokenized the way TeX would (scan.js), every command is
// held to an allowlist (commands.js) or to the names the document defines
// for itself (definitions.js), with the dangerous names refused whatever the
// document says (denied.js), and packages, environments and link addresses
// checked by their own rules. Everything that could make TeX read the text
// differently from this check is refused (raw.js), which is what lets one
// reading stand for the other.
//
// Pure: text in, verdict out, no file or process touched.
const MAX_PROBLEMS = 20

function checkCommand(name, k, defined, report) {
  if (name.length === 1 && !/[A-Za-z]/.test(name)) {
    if (!ALLOWED_SYMBOLS.has(name)) report(MESSAGES.unknownSymbol(name))
    return
  }
  const refused = denial(name)
  if (refused) report(refused)
  else if (!ALLOWED_COMMANDS.has(name) && !definedBefore(defined.commands, name, k)) report(MESSAGES.unknown(name))
}

export function checkTex(tex) {
  const text = typeof tex === 'string' ? tex : ''
  const problems = new Set()
  const report = (sentence) => { problems.add(sentence) }
  checkRaw(text, report)
  if (text.length <= MAX_TEX) {
    const tokens = scanTex(text)
    const defined = collectDefinitions(tokens)
    tokens.forEach((token, k) => {
      if (token.type === 'url') checkLink(token, tokens[k - 1]?.name ?? 'url', report)
      else if (token.type === 'cs') checkCommand(token.name, k, defined, report)
    })
    checkPackages(tokens, report)
    checkEnvironments(tokens, defined, report)
  }
  return { ok: problems.size === 0, problems: [...problems].slice(0, MAX_PROBLEMS) }
}
