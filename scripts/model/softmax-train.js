import { seeded, shuffled } from './random.js'

// Multinomial logistic regression on sparse features, trained by
// stochastic gradient descent with a per-weight step size (AdaGrad) and an
// L2 penalty. Small, dependency free and fast enough for ten thousand
// postings; the same arithmetic core's linear.js runs at inference.

// Feature names seen in at least minCount examples, each given a row.
export function vocabulary(featureMaps, minCount = 2) {
  const seen = new Map()
  for (const features of featureMaps) for (const name of features.keys()) seen.set(name, (seen.get(name) ?? 0) + 1)
  const vocab = new Map()
  for (const [name, count] of seen) if (count >= minCount) vocab.set(name, vocab.size)
  return vocab
}

// Sparse rows: { idx: Int32Array, val: Float32Array }, unknown names dropped.
export function vectorize(featureMaps, vocab) {
  return featureMaps.map((features) => {
    const idx = []
    const val = []
    for (const [name, value] of features) {
      const row = vocab.get(name)
      if (row === undefined) continue
      idx.push(row)
      val.push(value)
    }
    return { idx: Int32Array.from(idx), val: Float32Array.from(val) }
  })
}

function scores(W, x, K, bias, z) {
  for (let c = 0; c < K; c++) z[c] = W[bias + c]
  for (let t = 0; t < x.idx.length; t++) {
    const at = x.idx[t] * K
    for (let c = 0; c < K; c++) z[c] += W[at + c] * x.val[t]
  }
  let top = -Infinity
  for (let c = 0; c < K; c++) top = Math.max(top, z[c])
  let sum = 0
  for (let c = 0; c < K; c++) {
    z[c] = Math.exp(z[c] - top)
    sum += z[c]
  }
  for (let c = 0; c < K; c++) z[c] /= sum
}

// Weights as a Float32Array of (V + 1) rows by K classes; the last row is
// the bias. `ys` are class indexes.
export function trainSoftmax(xs, ys, V, K, { epochs = 15, rate = 0.2, l2 = 3e-4, seed = 1 } = {}) {
  const W = new Float32Array((V + 1) * K)
  const G = new Float32Array((V + 1) * K).fill(1e-8)
  const bias = V * K
  const random = seeded(seed)
  const z = new Float64Array(K)
  const step = (at, grad) => {
    G[at] += grad * grad
    W[at] -= (rate * grad) / Math.sqrt(G[at])
  }
  let order = xs.map((_, i) => i)
  for (let epoch = 0; epoch < epochs; epoch++) {
    order = shuffled(order, random)
    for (const n of order) {
      const x = xs[n]
      scores(W, x, K, bias, z)
      for (let c = 0; c < K; c++) {
        const g = z[c] - (c === ys[n] ? 1 : 0)
        for (let t = 0; t < x.idx.length; t++) {
          const at = x.idx[t] * K + c
          step(at, g * x.val[t] + l2 * W[at])
        }
        step(bias + c, g)
      }
    }
  }
  return W
}
