import { decodeModel } from '@jobdekho/core/model/weights.js'

// The trained weights as shipped (see core's model/weights.js for the
// format), stored as integers in thousandths. A feature is dropped when
// even its largest weight, times the value it typically has in a posting,
// moves a score by less than `cut`: a rare description word starts with a
// large weight but a tiny value, so its weight alone says little about
// whether it matters. Every held-out measurement is taken on weights
// compacted this way (cross-validate.js), so pruning cannot flatter them.
export const SCALE = 1000

export function compactModel({ name, version, classes, vocab, W, typical = null, temperature = 1, thresholds = {}, minWords = 0 }, { cut = 0.005 } = {}) {
  const K = classes.length
  const features = []
  const weights = []
  for (const [feature, row] of vocab) {
    const values = Array.from(W.subarray(row * K, row * K + K))
    const reach = Math.max(...values.map(Math.abs)) * (typical ? typical[row] : 1)
    if (reach < cut) continue
    features.push(feature)
    for (const v of values) weights.push(Math.round(v * SCALE))
  }
  const biasRow = vocab.size * K
  return {
    name,
    version,
    classes,
    temperature: Math.round(temperature * 10000) / 10000,
    thresholds,
    minWords,
    scale: SCALE,
    bias: Array.from(W.subarray(biasRow, biasRow + K), (v) => Math.round(v * SCALE)),
    features,
    weights,
  }
}

// The compacted model ready to score, so every measurement is of the
// weights exactly as they ship.
export const asShipped = (trained, options) => decodeModel(compactModel(trained, options))
