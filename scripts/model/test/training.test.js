import { describe, it, expect } from 'vitest'
import { vocabulary, vectorize, trainSoftmax } from '../softmax-train.js'
import { compactModel, asShipped } from '../compact.js'
import { fitTemperature } from '../calibrate.js'
import { foldOf, seeded, shuffled } from '../random.js'
import { logits, softmax } from '@jobdekho/core/model/linear.js'

// Three classes told apart by one word each, plus a word every class shares.
const examples = Array.from({ length: 90 }, (_, i) => {
  const y = i % 3
  return { y, features: new Map([[`w:${['red', 'green', 'blue'][y]}`, 0.7], ['w:shared', 0.7]]) }
})
const maps = examples.map((e) => e.features)
const ys = examples.map((e) => e.y)

describe('trainSoftmax', () => {
  it('learns the word that marks each class', () => {
    const vocab = vocabulary(maps, 2)
    const W = trainSoftmax(vectorize(maps, vocab), ys, vocab.size, 3, { epochs: 10, seed: 3 })
    const model = asShipped({ name: 't', version: 1, classes: ['a', 'b', 'c'], vocab, W }, { cut: 0 })
    for (const e of examples.slice(0, 3)) {
      const p = softmax(logits(model, e.features))
      expect(p.indexOf(Math.max(...p))).toBe(e.y)
    }
  })

  it('gives the same weights from the same seed', () => {
    const vocab = vocabulary(maps, 1)
    const once = trainSoftmax(vectorize(maps, vocab), ys, vocab.size, 3, { epochs: 3, seed: 5 })
    const twice = trainSoftmax(vectorize(maps, vocab), ys, vocab.size, 3, { epochs: 3, seed: 5 })
    expect(Array.from(twice)).toEqual(Array.from(once))
  })

  it('keeps only words seen often enough', () => {
    expect([...vocabulary([new Map([['a', 1]]), new Map([['a', 1], ['b', 1]])], 2).keys()]).toEqual(['a'])
  })
})

describe('compactModel', () => {
  it('stores weights in thousandths and drops the ones that barely move a score', () => {
    const vocab = new Map([['big', 0], ['tiny', 1]])
    const W = Float32Array.from([1.2345, -0.5, 0.001, 0.002, 0.1, -0.1])
    const json = compactModel({ name: 't', version: 2, classes: ['a', 'b'], vocab, W, typical: Float32Array.from([1, 1]) }, { cut: 0.01 })
    expect(json).toMatchObject({ features: ['big'], weights: [1235, -500], bias: [100, -100], scale: 1000, version: 2 })
    const scaled = compactModel({ name: 't', version: 2, classes: ['a', 'b'], vocab, W, typical: Float32Array.from([0.001, 1]) }, { cut: 0.01 })
    expect(scaled.features).toEqual([])
  })
})

describe('fitTemperature', () => {
  it('finds how much overconfident scores should be softened', () => {
    const random = seeded(9)
    const logitsList = []
    const truth = []
    for (let i = 0; i < 400; i++) {
      const p = 0.5 + 0.5 * random()
      truth.push(random() < p ? 0 : 1)
      const z = Math.log(p / (1 - p))
      logitsList.push([3 * z, 0])
    }
    expect(fitTemperature(logitsList, truth)).toBeCloseTo(3, 0)
  })
})

describe('folds and shuffles', () => {
  it('puts a company in one fold, always the same', () => {
    expect(foldOf('acme')).toBe(foldOf('acme'))
    expect(new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((c) => foldOf(c))).size).toBeGreaterThan(1)
  })

  it('shuffles the same way from the same seed', () => {
    expect(shuffled([1, 2, 3, 4, 5], seeded(1))).toEqual(shuffled([1, 2, 3, 4, 5], seeded(1)))
  })
})
