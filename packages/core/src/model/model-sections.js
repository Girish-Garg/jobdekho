import { units } from './tokens.js'
import { estimateSections } from './section-estimate.js'
import { shippedModel } from './weights.js'
import { auditPassed, shippedAudits } from './audit.js'
import { headingLine, inReadingOrder, foldFlag } from '../jd-layout.js'
import { NICE_CUE } from '../jd-headings.js'

// Sections for a description no heading organises (core's postingSections
// returned null), sorted line by line by the small section model:
//
//   [{ kind, heading: null, lines, boilerplate, from: 'model', version }]
//
// the same shape as postingSections, so the pane lays both out alike, and
// `from` says the sorting is the model's. A flattened body is cut into its
// sentences and bullets first; a list item keeps its "- ". Nothing is
// dropped but the few headings inside such a body, whose sections now name
// themselves.
//
// The pane reads a posting's first section as its opening and names every
// later one by its kind, so every line the model left unsorted opens the
// posting, in its own order, where no heading claims it; the sorted ones
// follow in reading order, and equal-opportunity and template text folds
// as it does under headings. null when the text is too short to sort, when
// the model placed fewer than two lines, or when it placed every one,
// which would leave the first sorted section read as an opening.
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

// The sorting itself, audited or not: what the review page and the
// training's measurements look at.
export function sortedSections(text, { isTemplate = () => false, model } = {}) {
  if (!model) return null
  const lines = sortableLines(text)
  if (lines.length < MIN_LINES) return null
  const kinds = placedKinds(lines, model)
  const placed = kinds.filter((kind) => kind !== 'other').length
  if (placed < MIN_PLACED || placed === lines.length) return null
  const opening = []
  const groups = new Map([['other', []]])
  lines.forEach((line, i) => {
    const kind = kinds[i]
    if (kind === 'other' && !foldFlag(line, 'other', isTemplate)) return opening.push(line)
    if (!groups.has(kind)) groups.set(kind, [])
    groups.get(kind).push(line)
  })
  if (!opening.length) return null
  const sorted = [...groups].filter(([, grouped]) => grouped.length).map(([kind, grouped]) => ({ kind, heading: null, lines: grouped }))
  return [{ kind: 'other', heading: null, lines: opening, boilerplate: false }, ...inReadingOrder(sorted, { isTemplate })]
    .map((s) => ({ ...s, from: 'model', version: model.version }))
}

// What the pane shows: nothing until the owner's audit of this very model
// version has passed (model/audit.js).
export function modelSections(text, { isTemplate = () => false, model = shippedModel('sections'), audits = shippedAudits() } = {}) {
  return auditPassed(audits, model) ? sortedSections(text, { isTemplate, model }) : null
}
