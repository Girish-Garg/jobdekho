import { MESSAGES } from './messages.js'

const words = (text) => text.trim().split(/\s+/)

// Commands refused by name, whatever else the document says, each group for
// the reason its sentence gives. The allowlist (commands.js) already refuses
// anything it does not name, so this list exists for two things it cannot
// do alone: a precise sentence for the dangerous cases, and a refusal that
// wins over a name the document defines itself. A document that says
// \providecommand{\openin}{} leaves the primitive untouched (\providecommand
// does nothing when the name exists), so "the document defined it" can never
// be allowed to vouch for any of these.
//
// Matched ignoring case: no safe command differs from one of these only in
// case, and refusing \Input as well costs nothing while closing off any
// trick that leans on case.
const GROUPS = {
  // pdfTeX opens any file the person can read, so any of these could print a
  // private file into a PDF that is then sent to an employer.
  reads: words(`input include includeonly InputIfFileExists IfFileExists openin read readline closein newread
    endinput includegraphics includepdf includesvg includestandalone verbatiminput VerbatimInput BVerbatimInput
    lstinputlisting inputminted import subimport inputfrom subfile subfileinclude bibliography addbibresource
    bibliographystyle LoadClass LoadClassWithOptions usetikzlibrary externaldocument font typein
    filedump filesize filemoddate mdfivesum GetFileInfo`),
  writes: words('openout write closeout immediate newwrite'),
  // Each of these lets a document spell a command without writing its name,
  // or change what a character means, after which this check's reading of
  // the text and TeX's reading of it are no longer the same.
  retokenizes: words(`csname endcsname ifcsname string scantokens everyeof endlinechar newlinechar escapechar
    catcode lccode uccode sfcode mathcode delcode expandafter noexpand unexpanded meaning makeatletter
    makeatother ExplSyntaxOn ExplSyntaxOff DeclareUnicodeCharacter newunicodechar obeylines obeyspaces
    everypar everyjob everymath everydisplay everyhbox everyvbox everycr toks`),
  // Plain TeX definitions bypass what \newcommand guarantees (a fresh name,
  // or a checked replacement), and the document-command family can declare
  // verbatim arguments that switch how TeX reads the text passed to them.
  rawDefinition: words(`def edef gdef xdef let futurelet global long outer protected chardef mathchardef
    countdef dimendef skipdef muskipdef toksdef afterassignment NewDocumentCommand RenewDocumentCommand
    ProvideDocumentCommand DeclareDocumentCommand NewExpandableDocumentCommand RenewExpandableDocumentCommand
    DeclareExpandableDocumentCommand NewDocumentEnvironment RenewDocumentEnvironment ProvideDocumentEnvironment
    DeclareDocumentEnvironment DeclareRobustCommand NewCommandCopy RenewCommandCopy DeclareCommandCopy`),
  // These read the text after them with other character codes, so a % or a
  // backslash inside means something different to TeX than to this check.
  verbatim: words('verb Verb lstinline mintinline nolinkurl path urldef'),
  engine: words('special shipout primitive pdfprimitive directlua latelua ShellEscape shellescape expanded'),
  // \uppercase and \lowercase rewrite character tokens by a table a document
  // could otherwise change; \MakeUppercase does the same job for text safely.
  changesCase: words('uppercase lowercase'),
}

// Whole families of engine primitives: pdfTeX's \pdf... (\pdfximage and
// \pdfobj embed files, \pdffiledump and \pdfmdfivesum read them), XeTeX's
// picture and PDF inclusion, and LuaTeX's Lua, which can do anything. The
// unprefixed \filedump and friends above are XeTeX's and LuaTeX's names for
// the same file readers: documents compile with pdfTeX, but the refusal
// should not depend on which engine a later change picks.
const PREFIXES = [/^pdf/i, /^xetex/i, /^(?:direct|late)?lua/i]

const BY_NAME = new Map(Object.entries(GROUPS).flatMap(([group, names]) => names.map((n) => [n.toLowerCase(), group])))

export function denial(name) {
  const group = BY_NAME.get(name.toLowerCase())
  if (group) return MESSAGES[group](name)
  return PREFIXES.some((prefix) => prefix.test(name)) ? MESSAGES.engine(name) : null
}

// Environments that read their body verbatim (so the text inside is not what
// this check read) or that write it to a file.
const VERBATIM_ENVIRONMENTS = words('verbatim verbatim* Verbatim Verbatim* BVerbatim LVerbatim lstlisting minted comment alltt')
const WRITING_ENVIRONMENTS = words('filecontents filecontents* filecontents** VerbatimOut')

export function environmentDenial(name) {
  const lower = name.toLowerCase()
  if (WRITING_ENVIRONMENTS.some((n) => n.toLowerCase() === lower)) return MESSAGES.writesEnvironment(name)
  if (VERBATIM_ENVIRONMENTS.some((n) => n.toLowerCase() === lower)) return MESSAGES.verbatimEnvironment(name)
  return null
}
