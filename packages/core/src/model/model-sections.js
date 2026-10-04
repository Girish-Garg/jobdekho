import { units } from './tokens.js'
import { estimateSections } from './section-estimate.js'
import { shippedModel } from './weights.js'
import { headingLine, inReadingOrder } from '../jd-layout.js'
import { NICE_CUE } from '../jd-headings.js'

// Sections for a description no heading organises (core's postingSections
// returned null), sorted line by line by the small section model:
//
//   [{ kind, heading: null, lines, boilerplate, from: 'model', version }]
//
// the same shape and reading order as postingSections, so the pane lays
// both out alike, and `from` says the sorting is the model's. A flattened
// body is cut into its sentences and bullets first; a list item keeps its
// "- ". Nothing is dropped but the few headings inside such a body, whose
// sections now name themselves. The lines the model was unsure of stay
// "other": those before the first line it placed open the posting as its
// summary, the rest close it. null when the text is too short to sort, or
// the model placed fewer than two lines, which reads better left as it was.
const MIN_LINES = 3
const MIN_PLACED = 2

// The lines the model sorts, in order, a list item starting "- ".
export function sortableLines(text) {
  const lines = []
  for (const unit of units(text)) {
    const head = headingLine(unit.text)
    if (head && head.kind !== 'other') continue
    lines.push(unit.bullet ? `- ${unit.text}` : unit.text)
  }
  return lines
}

// Each line's section as shown. A requirement marked optional ("is a
// plus") is a nice-to-have wherever it sits, core's rule (jd-headings.js).
export const placedKinds = (lines, model) => estimateSections(lines, model)
  .map((kind, i) => (kind === 'requirements' && NICE_CUE.test(lines[i]) ? 'nice' : kind))

export function modelSections(text, { isTemplate = () => false, model = shippedModel('sections') } = {}) {
  if (!model) return null
  const lines = sortableLines(text)
  if (lines.length < MIN_LINES) return null
  const kinds = placedKinds(lines, model)
  if (kinds.filter((kind) => kind !== 'other').length < MIN_PLACED) return null
  const first = kinds.findIndex((kind) => kind !== 'other')
  const groups = new Map()
  lines.forEach((line, i) => {
    if (i < first) return
    if (!groups.has(kinds[i])) groups.set(kinds[i], [])
    groups.get(kinds[i]).push(line)
  })
  const sections = [
    ...(first > 0 ? [{ kind: 'other', heading: null, lines: lines.slice(0, first) }] : []),
    ...[...groups].map(([kind, grouped]) => ({ kind, heading: null, lines: grouped })),
  ]
  return inReadingOrder(sections, { isTemplate, opens: first > 0 }).map((s) => ({ ...s, from: 'model', version: model.version }))
}
