// Scoring for the small models: a sparse linear layer and a softmax.
//
//   model: { classes, K, index: Map(feature -> row), W: Float32Array(rows * K),
//            bias: Float32Array(K), temperature, ... }
//
// A feature the weights never kept (pruned, or never seen in training)
// simply adds nothing.
export function logits(model, features) {
  const z = Float64Array.from(model.bias)
  for (const [name, value] of features) {
    const row = model.index.get(name)
    if (row === undefined) continue
    const at = row * model.K
    for (let c = 0; c < model.K; c++) z[c] += model.W[at + c] * value
  }
  return z
}

// Temperature above 1 softens overconfident scores; it was fitted on
// held-out postings so that a 0.9 means about nine in ten (calibrate.js).
export function softmax(z, temperature = 1) {
  const scaled = Array.from(z, (v) => v / temperature)
  const top = Math.max(...scaled)
  const e = scaled.map((v) => Math.exp(v - top))
  const sum = e.reduce((a, b) => a + b, 0)
  return e.map((v) => v / sum)
}

export const probabilities = (model, features) => softmax(logits(model, features), model.temperature)

// How hard each feature pushed toward the chosen classes and away from the
// rest, strongest first: the words an estimate's hover names.
export function pushes(model, features, chosen) {
  const others = model.classes.map((_, c) => c).filter((c) => !chosen.includes(c))
  const out = []
  for (const [name, value] of features) {
    const row = model.index.get(name)
    if (row === undefined) continue
    const w = (c) => model.W[row * model.K + c]
    const toward = chosen.reduce((s, c) => s + w(c), 0) / chosen.length
    const away = others.length ? others.reduce((s, c) => s + w(c), 0) / others.length : 0
    const push = value * (toward - away)
    if (push > 0) out.push({ name, push })
  }
  return out.sort((a, b) => b.push - a.push)
}
