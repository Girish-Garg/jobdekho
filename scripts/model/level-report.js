import { chooseThresholds, crossFoldCheck, precisionAt } from './thresholds.js'
import { foldSplits } from './cross-validate.js'
import { reliability } from './calibrate.js'
import { PAIRS, byGroup, shownBy, share, tally } from './level-score.js'

const GLOBAL = [0.9, 0.95, 0.97, 0.98, 0.99, 0.995]

// What a set of per-pair thresholds does on held-out postings and on the
// postings step 1 left unknown.
function atTarget(items, unknown, target, options) {
  const thresholds = chooseThresholds(byGroup(items), target, options)
  const shown = shownBy(items, thresholds)
  const unknownShown = shownBy(unknown, thresholds)
  return {
    target,
    thresholds,
    heldOut: { ...tally(shown), coverage: share(shown.length, items.length) },
    heldOutTitleSaidNothing: tally(shown.filter((item) => !item.marked)),
    thresholdsChosenWithoutTheTestFold: crossFoldCheck(foldSplits(items, (item) => item.group), target, options),
    byPair: Object.fromEntries(PAIRS.map((pair) => [pair, { threshold: thresholds[pair], ...tally(shown.filter((item) => item.group === pair)), unknown: unknownShown.filter((u) => u.group === pair).length }])),
    unknown: { covered: unknownShown.length },
  }
}

// One threshold for every pair at once, for the table the owner asked for.
function globalTable(items, unknown, unknownTotal) {
  return GLOBAL.map((t) => {
    const held = precisionAt(items, t)
    const shown = unknown.filter((u) => u.confidence >= t)
    return {
      threshold: t,
      heldOutCoverage: share(held.covered, items.length),
      precision: held.precision === null ? null : Math.round(held.precision * 10000) / 10000,
      wrong: held.covered - held.right,
      unknownCovered: shown.length,
      unknownCoverage: share(shown.length, unknownTotal),
      unknownByPair: Object.fromEntries(PAIRS.map((pair) => [pair, shown.filter((u) => u.group === pair).length]).filter(([, n]) => n)),
      unknownAtTrainedCompanies: shown.filter((u) => u.companySeen).length,
    }
  })
}

// The quick experiment's own measures, on the same held-out postings: the
// single likeliest level, exactly right or within one level of the truth.
function topLevelTable(items) {
  return [0.9, 0.95].map((t) => {
    const kept = items.filter((item) => item.topConfidence >= t)
    return { threshold: t, coverage: share(kept.length, items.length), exact: share(kept.filter((i) => i.exact).length, kept.length), withinOne: share(kept.filter((i) => i.nearTop).length, kept.length) }
  })
}

export function levelReport({ items, unknownItems, unknownTotal, options }) {
  const unknownWithText = unknownItems.length
  return {
    heldOut: { postings: items.length, titleSaidNothing: items.filter((item) => !item.marked).length },
    unknown: { postings: unknownTotal, withText: unknownWithText },
    globalThresholds: globalTable(items, unknownItems, unknownTotal),
    chosen: atTarget(items, unknownItems, 0.995, options),
    alternative: atTarget(items, unknownItems, 0.98, options),
    lowerTargets: [0.95, 0.9].map((target) => {
      const r = atTarget(items, unknownItems, target, options)
      return { target, thresholds: r.thresholds, heldOut: r.heldOut, unknown: r.unknown }
    }),
    likeliestLevel: topLevelTable(items),
    reliability: reliability(items),
  }
}
