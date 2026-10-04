import { FOLDS, foldOf } from './random.js'
import { vocabulary, vectorize, trainSoftmax } from './softmax-train.js'
import { asShipped } from './compact.js'
import { logits } from '@jobdekho/core/model/linear.js'

// `examples` are [{ companyKey, y, features }], features a Map of name to
// value. `spec` is { name, version, classes, minCount, hp, cut }.

// Trained float weights, the vocabulary they index, and each feature's
// typical value where it occurs (compact.js weighs a weight by it).
export function fitTrained(examples, spec) {
  const maps = examples.map((e) => e.features)
  const vocab = vocabulary(maps, spec.minCount)
  const xs = vectorize(maps, vocab)
  const W = trainSoftmax(xs, examples.map((e) => e.y), vocab.size, spec.classes.length, spec.hp)
  const sum = new Float64Array(vocab.size)
  const count = new Float64Array(vocab.size)
  for (const x of xs) {
    for (let t = 0; t < x.idx.length; t++) {
      sum[x.idx[t]] += x.val[t]
      count[x.idx[t]] += 1
    }
  }
  return { vocab, W, typical: Float32Array.from(sum, (s, row) => (count[row] ? s / count[row] : 0)) }
}

// A model trained on `examples` and compacted exactly as it would ship.
export function fitShipped(examples, spec, extra = {}) {
  const { vocab, W, typical } = fitTrained(examples, spec)
  return asShipped({ name: spec.name, version: spec.version, classes: spec.classes, vocab, W, typical, ...extra }, { cut: spec.cut })
}

// Out-of-fold scores: each example's logits from a model whose training
// never saw its company (see random.js foldOf).
export function outOfFold(examples, spec) {
  const out = new Array(examples.length)
  for (let k = 0; k < FOLDS; k++) {
    const model = fitShipped(examples.filter((e) => foldOf(e.companyKey) !== k), spec)
    examples.forEach((e, i) => {
      if (foldOf(e.companyKey) === k) out[i] = logits(model, e.features)
    })
  }
  return out
}

// Scored held-out items split by fold, for the cross-fold threshold check:
// [{ train: byGroup, test: byGroup }], `groupOf` naming each item's group.
export function foldSplits(items, groupOf) {
  const byGroup = (list) => {
    const groups = {}
    for (const item of list) (groups[groupOf(item)] ??= []).push(item)
    return groups
  }
  return Array.from({ length: FOLDS }, (_, k) => ({
    train: byGroup(items.filter((item) => item.fold !== k)),
    test: byGroup(items.filter((item) => item.fold === k)),
  }))
}
