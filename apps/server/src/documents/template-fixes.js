// Lines JobDekho's own templates once wrote wrong, and what they should have
// been. A document is the person's own source, so nothing else in it is ever
// rewritten: only these exact lines, which no person would have typed, and
// only as a new version they can see and restore past (see read.js).
//
// The section rule: the templates drew it after pulling back up 5 or 6pt, so
// it ran through every heading's letters and each section read as struck
// out. Compact also had \MakeUppercase where it grabbed titlesec's own row
// macro once the rule changed, so it moves to the slot that gets the title.
// The spacing under the heading follows the rule, and only where the rule
// itself was the old one, since a person may have set their own spacing.
const B = String.fromCharCode(92)
const format = (style, before, rule) => `${B}titleformat{${B}section}{${style}}{}{0pt}{${before}}[${rule}]`
const oldRule = (pt) => `{${B}vspace{-${pt}pt}${B}hrule${B}vspace{${pt}pt}}`
const newRule = `${B}vspace{1pt}${B}titlerule`
const spacing = (above, below) => `${B}titlespacing*{${B}section}{0pt}{${above}pt}{${below}pt}`

const FIXES = [
  { from: format(`${B}large${B}bfseries`, '', oldRule(6)), to: format(`${B}large${B}bfseries`, '', newRule), spacing: [spacing(10, 2), spacing(10, 5)] },
  { from: format(`${B}normalsize${B}bfseries${B}MakeUppercase`, '', oldRule(5)), to: format(`${B}normalsize${B}bfseries`, `${B}MakeUppercase`, newRule), spacing: [spacing(7, 2), spacing(7, 4)] },
  { from: format(`${B}normalsize${B}scshape`, '', oldRule(6)), to: format(`${B}normalsize${B}scshape`, '', newRule), spacing: [spacing(12, 3), spacing(12, 5)] },
]

export function fixTemplateLines(tex) {
  let out = String(tex ?? '')
  for (const { from, to, spacing: [oldSpacing, newSpacing] } of FIXES) {
    if (!out.includes(from)) continue
    out = out.split(from).join(to).split(oldSpacing).join(newSpacing)
  }
  return out
}
