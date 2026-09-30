import { describe, it, expect } from 'vitest'
import { featuresFor, fitContextFor } from '@jobdekho/store/fit-inputs.js'
import { FEATURES_VERSION } from '@jobdekho/core/posting-features.js'

// A stand-in for store.corpus: rows() hands back the same array until a
// "scrape" replaces it, which is the identity the caches key on.
function fakeStore(rows) {
  let current = rows
  return { corpus: { rows: () => current, replace: (next) => { current = next } } }
}

const row = (id, title, extra = {}) => ({ id, title, ...extra })

describe('featuresFor', () => {
  it('uses the features a row carries without reading anything', () => {
    const f = { v: FEATURES_VERSION, skills: { go: 'title' }, band: null, from: null, titleLevel: null }
    const r = row('a', 'React Developer', { features: f })
    expect(featuresFor([r], r)).toBe(f)
  })

  // Rows stored before features existed are read once per loaded corpus.
  it('reads a row without features once, then answers from memory', () => {
    const rows = [row('a', 'React Developer')]
    const first = featuresFor(rows, rows[0])
    expect(first.skills).toEqual({ react: 'title' })
    expect(featuresFor(rows, { ...rows[0] })).toBe(first)
  })
})

describe('fitContextFor', () => {
  it('builds the person\'s side of the fit, with rarity measured on the corpus', () => {
    const store = fakeStore([row('a', 'Go Developer'), row('b', 'Go Engineer'), row('c', 'Rust Engineer')])
    const ctx = fitContextFor(store, { skills: ['go'], years: 2 })
    expect(ctx.held.get('go')).toBe(1)
    expect(ctx.rarity('rust')).toBeGreaterThan(ctx.rarity('go'))
  })

  it('keeps one context per profile version for as long as the corpus stays', () => {
    const store = fakeStore([row('a', 'Go Developer')])
    const a = fitContextFor(store, { skills: ['go'], years: 2 })
    expect(fitContextFor(store, { skills: ['go'], years: 2, basics: { headline: 'new' } })).toBe(a)
    expect(fitContextFor(store, { skills: ['go', 'rust'], years: 2 })).not.toBe(a)
  })

  // A scrape hands out a new array, so nothing computed against the old one
  // can answer for the new.
  it('starts over when the corpus is replaced', () => {
    const store = fakeStore([row('a', 'Go Developer')])
    const before = fitContextFor(store, { skills: ['go'] })
    store.corpus.replace([row('a', 'Go Developer'), row('b', 'Rust Developer')])
    expect(fitContextFor(store, { skills: ['go'] })).not.toBe(before)
  })
})
