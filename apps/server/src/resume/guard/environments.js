import { readBrace, skipBlank } from './args.js'
import { ALLOWED_ENVIRONMENTS } from './commands.js'
import { denial, environmentDenial } from './denied.js'
import { definedBefore } from './definitions.js'
import { MESSAGES } from './messages.js'

// \begin{name} is a command chosen by a string: LaTeX runs \name for it, and
// \end{name} runs \endname. So \begin{input}{secret} is \input{secret}, and
// the name is checked the way a command name is: refused by name first
// (verbatim bodies, file writers, and every refused command, with and
// without its "end"), then allowed only if it is a standard environment or
// one the document defined before this point (see definitions.js). A name
// that is not plain letters (\begin{\x}, \begin{#1}) is refused, since only
// a plain name can be checked at all.
const PLAIN = /^[A-Za-z]+\*?$/

function refusal(name) {
  const bare = name.replace(/\*$/, '')
  return environmentDenial(name) ?? denial(bare) ?? denial(`end${bare}`)
}

export function checkEnvironments(tokens, defined, report) {
  tokens.forEach((token, k) => {
    if (token.type !== 'cs' || (token.name !== 'begin' && token.name !== 'end')) return
    const group = readBrace(tokens, skipBlank(tokens, k + 1))
    const name = group ? group.text.trim() : ''
    if (!group || group.inner.some((t) => t.type !== 'char') || !PLAIN.test(name)) {
      report(MESSAGES.environmentName(token.name))
      return
    }
    const refused = refusal(name)
    if (refused) report(refused)
    else if (!ALLOWED_ENVIRONMENTS.has(name) && !definedBefore(defined.environments, name, k)) report(MESSAGES.unknownEnvironment(name))
  })
}
