// The one place profile text (and later, model output) turns into LaTeX
// source. Every value from the profile passes through here before it reaches
// a .tex file, which is what keeps a bullet point from ever being read as a
// command.
//
// A single regex-with-function pass over the ORIGINAL string is what makes
// this safe against re-injection: `String.replace` never rescans the text a
// callback returns, so escaping `\` to `\textbackslash{}` cannot have its own
// braces picked up and escaped a second time, and a value that is itself
// "\textbackslash{}" typed by a person renders as that literal text, not as
// a working command.
const SPECIAL = /[\\{}$&#^_~%]/g

const REPLACEMENTS = {
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  $: '\\$',
  '&': '\\&',
  '#': '\\#',
  '^': '\\textasciicircum{}',
  _: '\\_',
  '~': '\\textasciitilde{}',
  '%': '\\%',
}

// Control characters have no business in a resume and some (a bare form
// feed, a vertical tab) can stall or confuse pdfTeX; \n and \t are kept
// since a caller decides separately whether newlines matter to it.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g

function toStr(value) {
  return value === null || value === undefined ? '' : String(value)
}

// The general-purpose escaper: safe to drop anywhere in a .tex file's body.
// Newlines survive (TeX reads one as a space and a blank line as a new
// paragraph), so multi-line input still means something.
export function escapeLatex(value) {
  return toStr(value)
    .replace(CONTROL, '')
    .replace(SPECIAL, (ch) => REPLACEMENTS[ch])
}

// For a field that has to stay one line - a name, a title, a date range - so
// stray newlines a person pasted in cannot split a macro argument across
// lines in a way that changes how the rest of the header lays out.
export function escapeLine(value) {
  return escapeLatex(value).replace(/\s+/g, ' ').trim()
}

// \href's first argument is parsed by hyperref in a near-verbatim catcode
// regime (the same trick \url uses), which is what makes a real URL survive
// unescaped - and exactly why an arbitrary profile string can never be
// dropped in there: escapeLatex's rules do not apply in that regime, so
// nothing here would stop a `}` or a `\` from breaking out of the argument.
// Instead the raw value is checked against a whitelist of characters a URL
// is actually made of; only a value that matches whole becomes a live link,
// and even then the visible text is the same URL, never a substituted label.
// Anything else - including anything with a brace, a backslash or a dollar
// sign - falls back to plain escaped text, which is always safe.
const SAFE_URL = /^[a-z][a-z0-9+.-]*:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/i

export function texLink(value) {
  const text = escapeLine(value)
  if (!text) return ''
  const trimmed = toStr(value).trim()
  return SAFE_URL.test(trimmed) ? `\\href{${trimmed}}{${text}}` : text
}
