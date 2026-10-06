import { descriptionFacts } from '@jobdekho/core/description-facts.js'
import { chooseThresholds, crossFoldCheck, precisionAt } from './thresholds.js'
import { foldSplits } from './cross-validate.js'
import { reliability } from './calibrate.js'
import { FACT_KINDS } from './fact-data.js'

// What the facts model does on lines from companies it never saw, set
// beside what the plain readers do on the same lines. `items` are
// { group, confidence, right, fold, truth, text }: the likeliest fact, the
// hand label, the line. "None" is never shown, so never counts as covered.
const SHOWN = FACT_KINDS.filter((kind) => kind !== 'none')
const share = (part, whole) => (whole ? Math.round((10000 * part) / whole) / 10000 : null)
const tally = (items) => {
  const right = items.filter((item) => item.right).length
  return { covered: items.length, right, precision: share(right, items.length) }
}
const byKind = (items) => Object.fromEntries(SHOWN.map((kind) => [kind, items.filter((item) => item.group === kind)]))

// Of the lines stating a fact, the share the plain readers find on their
// own, the share the model shows, and the share either one does.
function found(items, kind, shown, ruled) {
  const stated = items.filter((item) => item.truth === kind)
  const byModel = new Set(shown.filter((item) => item.group === kind && item.right))
  const either = stated.filter((item) => byModel.has(item) || ruled.has(item))
  return { stated: stated.length, rules: share(stated.filter((item) => ruled.has(item)).length, stated.length), model: share(byModel.size, stated.length), either: share(either.length, stated.length) }
}

function atTarget(items, target, options, ruledBy) {
  const thresholds = chooseThresholds(byKind(items), target, options)
  const shown = items.filter((item) => thresholds[item.group] != null && item.confidence >= thresholds[item.group])
  return {
    target,
    thresholds,
    heldOut: tally(shown),
    thresholdsChosenWithoutTheTestFold: crossFoldCheck(foldSplits(items.filter((item) => item.group !== 'none'), (item) => item.group), target, options),
    byKind: Object.fromEntries(SHOWN.map((kind) => [kind, {
      threshold: thresholds[kind], ...tally(shown.filter((item) => item.group === kind)), ...found(items, kind, shown, ruledBy[kind]),
    }])),
  }
}

export function factReport(items, options) {
  // The rules read each line alone, as they would that line in a posting.
  const ruledBy = Object.fromEntries(SHOWN.map((kind) => [kind, new Set()]))
  for (const item of items) {
    if (item.truth === 'none') continue
    const facts = descriptionFacts(item.text, { model: null })
    if (facts[item.truth]) ruledBy[item.truth].add(item)
  }
  const shownable = items.filter((item) => item.group !== 'none')
  return {
    heldOut: { lines: items.length },
    chosen: atTarget(items, 0.99, options, ruledBy),
    alternative: atTarget(items, 0.95, options, ruledBy),
    globalThresholds: [0.8, 0.9, 0.95, 0.99].map((t) => {
      const at = precisionAt(shownable, t)
      return { threshold: t, covered: at.covered, precision: at.precision === null ? null : Math.round(at.precision * 10000) / 10000, wrong: at.covered - at.right }
    }),
    reliability: reliability(shownable),
  }
}
