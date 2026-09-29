// One plain sentence per problem, written for the person looking at their
// own document rather than for a log: what is wrong, and why it matters
// here. The same sentence is never listed twice (see check.js), so each
// names the command it is about.
const cs = (name) => `"\\${name}"`
const clip = (text) => (text.length > 60 ? `${text.slice(0, 60)}...` : text)

export const MESSAGES = {
  reads: (name) => `${cs(name)} reads files from this computer, so it is not allowed in a document.`,
  writes: (name) => `${cs(name)} writes files on this computer, so it is not allowed in a document.`,
  retokenizes: (name) => `${cs(name)} can build or re-read commands in a way this check cannot follow, so it is not allowed in a document.`,
  rawDefinition: (name) => `${cs(name)} defines commands in a way this check cannot follow, so it is not allowed in a document. Use \\newcommand instead.`,
  verbatim: (name) => `${cs(name)} changes how TeX reads the text after it, so it is not allowed in a document.`,
  engine: (name) => `${cs(name)} is a low-level engine command that can reach outside the document, so it is not allowed in a document.`,
  changesCase: (name) => `${cs(name)} rewrites the characters inside it before TeX reads them, so it is not allowed in a document. Use \\Make${name[0].toUpperCase()}${name.slice(1)} for text.`,
  unknown: (name) => `${cs(name)} is not on JobDekho's list of safe LaTeX commands. Use a standard command, or define it with \\newcommand before it is used.`,
  unknownSymbol: (ch) => `"\\${ch}" is not a LaTeX command JobDekho knows is safe, so it is not allowed in a document.`,

  carets: () => '"^^" is TeX\'s character-code notation, which can spell a hidden command, so it is not allowed in a document.',
  control: () => 'The document holds an invisible control character, which TeX may read differently than this check does. Remove it.',
  lookalike: (ch) => `The document holds "${ch}", which looks like a backslash but is not one. Type a plain backslash instead.`,
  tooLong: (max) => `The document is longer than ${max} characters, which is far more than a resume or a letter needs.`,

  verbatimEnvironment: (name) => `The "${name}" environment changes how TeX reads the text inside it, so it is not allowed in a document.`,
  writesEnvironment: (name) => `The "${name}" environment writes files on this computer, so it is not allowed in a document.`,
  unknownEnvironment: (name) => `The "${name}" environment is not on JobDekho's list of safe environments. Use a standard one, or define it with \\newenvironment before it is used.`,
  environmentName: (command) => `"\\${command}" needs a plain environment name in braces, like \\${command}{itemize}.`,

  documentClass: (name) => `Only the article and letter document classes are allowed, not "${clip(name)}".`,
  package: (name) => `The "${clip(name)}" package is not on JobDekho's list of safe packages, so it is not allowed in a document.`,
  packageName: (command) => `"\\${command}" needs plain package names in braces, like \\${command}{geometry}.`,
  options: (command) => `The options given to "\\${command}" hold characters or settings that could name a file, so they are not allowed.`,

  linkBraces: (command) => `"\\${command}" must be followed directly by its address in braces, like \\href{https://example.com}{text}.`,
  link: (url) => `A link must start with https://, http://, mailto: or tel: and hold no spaces, backslashes, braces or percent signs; "${clip(url)}" does not.`,
}
