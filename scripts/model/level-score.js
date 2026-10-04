import { softmax, probabilities } from '@jobdekho/core/model/linear.js'
import { bestPair, pairName } from '@jobdekho/core/model/level-estimate.js'
import { LEVELS } from '@jobdekho/core/level.js'

export const PAIRS = LEVELS.slice(0, -1).map((_, lo) => pairName(LEVELS, lo))

// A held-out posting as the threshold and the report see it: the pair the
// model would show, how sure it is, and whether the level step 1 found
// sits inside that pair.
export function scoreKnown(known, oofLogits, temperature) {
  return known.map((e, i) => {
    const p = softmax(oofLogits[i], temperature)
    const { lo, confidence } = bestPair(p)
    const top = p.indexOf(Math.max(...p))
    return {
      group: PAIRS[lo], lo, confidence, right: e.y === lo || e.y === lo + 1, fold: e.fold, marked: e.marked,
      top, topConfidence: p[top], exact: top === e.y, nearTop: Math.abs(top - e.y) <= 1,
    }
  })
}

// The final model's view of the postings step 1 left unknown, and whether
// the model trained on other postings of the same company.
export function scoreUnknown(unknown, model, trainedCompanies = new Set()) {
  return unknown.filter((e) => e.withText).map((e) => {
    const { lo, confidence } = bestPair(probabilities(model, e.features))
    return { group: PAIRS[lo], lo, confidence, source: e.source.split(':')[0], companySeen: trainedCompanies.has(e.companyKey) }
  })
}

export function byGroup(items) {
  const groups = Object.fromEntries(PAIRS.map((pair) => [pair, []]))
  for (const item of items) groups[item.group].push(item)
  return groups
}

// Items a set of per-pair thresholds would show.
export const shownBy = (items, thresholds) => items.filter((item) => thresholds[item.group] != null && item.confidence >= thresholds[item.group])

export const share = (part, whole) => (whole ? Math.round((10000 * part) / whole) / 10000 : null)

export function tally(items) {
  const right = items.filter((item) => item.right).length
  return { covered: items.length, right, precision: share(right, items.length) }
}
