import { scanTex } from '../resume/guard/scan.js'

// The words a reader of the PDF would see, pulled out of a .tex source so
// the fact check (see fact-flags.js) compares claims, not markup. Read with
// the guard's own tokenizer, so a comment, an escaped % or a link address
// is understood exactly as the guard and TeX understand it.
//
// Line breaks matter to the fact check: a line that opens with a verb is a
// bullet, a line that opens with capitals is a name (see actions/
// resume-names.js). So every place the PDF starts a new line, and every
// boundary between two arguments ("}{" in \resEntryHeader{Title}{Acme}),
// becomes one here, and each \item becomes a "- " bullet.

// Commands whose first N brace groups are settings, not words: sizes,
// colours, environment names, column specs.
const SETTINGS_ARGS = {
  vspace: 1, hspace: 1, setlength: 2, addtolength: 2, rule: 2, fontsize: 2, raisebox: 1, begin: 1, end: 1,
  setcounter: 2, addtocounter: 2, pagestyle: 1, thispagestyle: 1, textcolor: 1, color: 1, colorbox: 1,
  definecolor: 3, hypersetup: 1, geometry: 1, newgeometry: 1, setlist: 1, multicolumn: 2, linespread: 1,
}
const BREAKS = new Set(['\\', 'par', 'newline', 'linebreak', 'hfill', 'section', 'subsection', 'resSection',
  'resEntryHeader', 'resEntryHeaderPlain', 'resSkillRow', 'resMetaLine', 'resHeader', 'letterHeader', 'letterTo',
  'begin', 'end', 'opening', 'closing', 'signature', 'hrule'])
const CHARACTERS = {
  '&': '&', '%': '%', '$': '$', '#': '#', _: '_', '{': '{', '}': '}', ' ': ' ', ',': ' ', '~': '~',
  textbackslash: '\\', textasciitilde: '~', textasciicircum: '^', textbar: '|', ldots: '...', dots: '...',
  textendash: '-', textemdash: '-', textbullet: ' ', textperiodcentered: ' ',
}
// A size or a skip left in the words ("4pt", "-0.5em") is layout, and would
// read as a number the profile never had.
const DIMENSION = /-?\d*\.?\d+\s*(?:pt|em|ex|in|cm|mm|bp|sp|pc|dd|cc|mu)\b/g

const isChar = (t, ch) => t?.type === 'char' && t.ch === ch

// Index just past the brace group or bracket group opening at k.
function skipGroup(tokens, k, open, close) {
  if (!isChar(tokens[k], open)) return k
  let depth = 0
  for (let j = k; j < tokens.length; j += 1) {
    if (isChar(tokens[j], open)) depth += 1
    else if (isChar(tokens[j], close) && (depth -= 1) === 0) return j + 1
  }
  return tokens.length
}

function body(tex) {
  const text = String(tex ?? '')
  const start = text.indexOf('\\begin{document}')
  const end = text.lastIndexOf('\\end{document}')
  return text.slice(start === -1 ? 0 : start + '\\begin{document}'.length, end > start ? end : text.length)
}

export function texToText(tex) {
  const tokens = scanTex(body(tex))
  let out = ''
  let k = 0
  while (k < tokens.length) {
    const t = tokens[k]
    k += 1
    if (t.type === 'url') continue
    if (t.type === 'char') {
      if (t.ch === '}' && isChar(tokens[k], '{')) out += '\n'
      else if (t.ch === '~') out += ' '
      else if (t.ch !== '{' && t.ch !== '}') out += t.ch
      continue
    }
    if (t.name === 'item') out += '\n- '
    else if (BREAKS.has(t.name)) out += '\n'
    else if (Object.hasOwn(CHARACTERS, t.name)) out += CHARACTERS[t.name]
    k = skipGroup(tokens, k, '[', ']')
    for (let n = Object.hasOwn(SETTINGS_ARGS, t.name) ? SETTINGS_ARGS[t.name] : 0; n > 0; n -= 1) k = skipGroup(tokens, k, '{', '}')
  }
  return out.replace(DIMENSION, ' ').split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n')
}
