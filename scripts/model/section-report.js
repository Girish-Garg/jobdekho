import { softmax } from '@jobdekho/core/model/linear.js'
import { sortedSections } from '@jobdekho/core/model/model-sections.js'
import { postingSections } from '@jobdekho/core/jd-layout.js'
import { chooseThresholds, crossFoldCheck, precisionAt } from './thresholds.js'
import { foldSplits } from './cross-validate.js'
import { reliability } from './calibrate.js'
import { SECTION_KINDS } from './section-data.js'

const SHOWN = SECTION_KINDS.filter((kind) => kind !== 'other')
const share = (part, whole) => (whole ? Math.round((10000 * part) / whole) / 10000 : null)
const tally = (items) => {
  const right = items.filter((item) => item.right).length
  return { covered: items.length, right, precision: share(right, items.length) }
}

// A held-out line as the thresholds see it: its likeliest section and
// whether the heading over it agreed. "Other" is never shown, so it never
// counts as covered.
export function scoreHeldOut(examples, oofLogits, temperature) {
  return examples.map((e, i) => {
    const p = softmax(oofLogits[i], temperature)
    const c = p.indexOf(Math.max(...p))
    return { group: SECTION_KINDS[c], confidence: p[c], right: c === e.y, fold: e.fold }
  })
}

function byKind(items) {
  const groups = Object.fromEntries(SHOWN.map((kind) => [kind, []]))
  for (const item of items) if (groups[item.group]) groups[item.group].push(item)
  return groups
}

function atTarget(items, target, options) {
  const thresholds = chooseThresholds(byKind(items), target, options)
  const shown = items.filter((item) => thresholds[item.group] != null && item.confidence >= thresholds[item.group])
  return {
    target,
    thresholds,
    heldOut: { ...tally(shown), coverage: share(shown.length, items.length) },
    thresholdsChosenWithoutTheTestFold: crossFoldCheck(foldSplits(items.filter((item) => item.group !== 'other'), (item) => item.group), target, options),
    byKind: Object.fromEntries(SHOWN.map((kind) => [kind, { threshold: thresholds[kind], ...tally(shown.filter((item) => item.group === kind)) }])),
  }
}

// What the shipped model does to the postings it is for, those whose text
// has no heading step 1 reads, once its audit lets the pane show it.
export function unheadedReport(postings, model) {
  const texts = postings.filter((p) => p.description.length >= 300 && !postingSections(p.description, { company: p.company }))
  let sorted = 0
  let lines = 0
  const placed = {}
  for (const p of texts) {
    const sections = sortedSections(p.description, { model })
    if (!sections) continue
    sorted += 1
    for (const s of sections) {
      lines += s.lines.length
      if (s.kind !== 'other') placed[s.kind] = (placed[s.kind] ?? 0) + s.lines.length
    }
  }
  const placedLines = Object.values(placed).reduce((a, b) => a + b, 0)
  return { postings: texts.length, sorted, sortedShare: share(sorted, texts.length), lines, placedLines, placedShare: share(placedLines, lines), placed }
}

export function sectionReport(items, options) {
  const shownable = items.filter((item) => item.group !== 'other')
  return {
    heldOut: { lines: items.length },
    globalThresholds: [0.9, 0.95, 0.98, 0.99, 0.995].map((t) => {
      const at = precisionAt(shownable, t)
      return { threshold: t, coverage: share(at.covered, items.length), precision: at.precision === null ? null : Math.round(at.precision * 10000) / 10000, wrong: at.covered - at.right }
    }),
    chosen: atTarget(items, 0.995, options),
    alternative: atTarget(items, 0.98, options),
    accuracy: share(items.filter((item) => item.right).length, items.length),
    reliability: reliability(shownable),
  }
}
