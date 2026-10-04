import { describe, it, expect } from 'vitest'
import { chooseThreshold, chooseThresholds, crossFoldCheck, precisionAt } from '../thresholds.js'

// `n` outputs at one confidence, `wrong` of them wrong.
const at = (confidence, n, wrong = 0) => Array.from({ length: n }, (_, i) => ({ confidence, right: i >= wrong }))

describe('precisionAt', () => {
  it('counts what a threshold would show', () => {
    expect(precisionAt([...at(0.99, 9, 1), ...at(0.5, 5)], 0.9)).toEqual({ covered: 9, right: 8, precision: 8 / 9 })
    expect(precisionAt([], 0.9).precision).toBeNull()
  })
})

describe('chooseThreshold', () => {
  it('walks from strict to lenient and stops at the first point under the target', () => {
    const scored = [...at(0.999, 100), ...at(0.98, 100), ...at(0.95, 100, 10), ...at(0.9, 300)]
    // At 0.95 precision is 290/300, under 99%, so the walk ends at the grid
    // point before it, 0.96; the clean outputs below cannot win it back.
    expect(chooseThreshold(scored, 0.99)).toBe(0.96)
  })

  it('skips points that cover too few outputs to measure', () => {
    // The one wrong output in ten at the top would fail the walk at once.
    const scored = [...at(0.9999, 10, 1), ...at(0.99, 100), ...at(0.9, 100, 50)]
    expect(chooseThreshold(scored, 0.99, { minSupport: 50 })).toBe(0.91)
    expect(chooseThreshold(scored, 0.99, { minSupport: 5 })).toBeNull()
  })

  it('gives no threshold when no point reaches the target', () => {
    expect(chooseThreshold(at(0.99, 100, 10), 0.995)).toBeNull()
    expect(chooseThreshold(at(0.99, 10), 0.995)).toBeNull()
  })

  it('chooses one threshold per group', () => {
    expect(chooseThresholds({ good: at(0.99, 100), bad: at(0.99, 100, 20) }, 0.98)).toEqual({ good: 0.5, bad: null })
  })
})

describe('crossFoldCheck', () => {
  it('measures each fold with thresholds chosen on the others', () => {
    const fold = (wrong) => ({ train: { g: at(0.99, 100) }, test: { g: at(0.99, 50, wrong) } })
    expect(crossFoldCheck([fold(0), fold(1)], 0.98)).toEqual({ covered: 100, right: 99, precision: 0.99 })
  })
})
