import { softmax } from '@jobdekho/core/model/linear.js'

// Temperature scaling: one number that softens or sharpens every score so
// the probabilities mean what they say on postings the model never saw. It
// is fitted on out-of-fold scores, by the negative log likelihood of the
// true classes, and a single parameter cannot overfit a few thousand of
// them the way a curve per class could.
export function negLogLikelihood(logits, ys, temperature) {
  let sum = 0
  for (let i = 0; i < logits.length; i++) sum -= Math.log(Math.max(1e-12, softmax(logits[i], temperature)[ys[i]]))
  return sum
}

// Golden-section search: the likelihood is smooth and has one minimum in T.
export function fitTemperature(logits, ys, { lo = 0.2, hi = 5, steps = 60 } = {}) {
  let a = lo
  let b = hi
  const g = (Math.sqrt(5) - 1) / 2
  let c = b - g * (b - a)
  let d = a + g * (b - a)
  for (let i = 0; i < steps; i++) {
    if (negLogLikelihood(logits, ys, c) < negLogLikelihood(logits, ys, d)) b = d
    else a = c
    c = b - g * (b - a)
    d = a + g * (b - a)
  }
  return (a + b) / 2
}

// How well the confidence matches the truth, in bands: { from, to, n, right }.
export function reliability(scored, edges = [0.5, 0.7, 0.8, 0.9, 0.95, 0.98, 0.99, 0.995, 1.0001]) {
  const bands = []
  for (let i = 0; i + 1 < edges.length; i++) {
    const inBand = scored.filter((s) => s.confidence >= edges[i] && s.confidence < edges[i + 1])
    bands.push({ from: edges[i], to: Math.min(1, edges[i + 1]), n: inBand.length, right: inBand.filter((s) => s.right).length })
  }
  return bands
}
