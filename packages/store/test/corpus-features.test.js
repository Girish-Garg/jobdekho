import { describe, it, expect } from 'vitest'
import { withFeatures } from '@jobdekho/store/corpus-features.js'
import { refreshed } from '@jobdekho/store/corpus-merge.js'
import { toRow } from '@jobdekho/store/queries.js'
import { FEATURES_VERSION } from '@jobdekho/core/posting-features.js'

const current = (skills) => ({ v: FEATURES_VERSION, skills, band: null, from: null, titleLevel: null })

describe('the features column', () => {
  it('is stored with the row, or null for a source that predates it', () => {
    expect(toRow({ id: 'a', features: current({ go: 'title' }) }).features).toEqual(current({ go: 'title' }))
    expect(toRow({ id: 'a' }).features).toBeNull()
  })

  it('is refreshed by a sighting that carries the full ad', () => {
    const merged = refreshed({ id: 'a', descriptionText: 'old', features: current({ go: 'req' }) },
      { id: 'a', descriptionText: 'new', features: current({ rust: 'req' }) })
    expect(merged.features).toEqual(current({ rust: 'req' }))
  })

  // A bare LinkedIn card carries no text; what was read from the full ad on
  // an earlier run has to stay, like the description it came from.
  it('survives a bare card that brings no text', () => {
    const merged = refreshed({ id: 'a', descriptionText: 'full ad', features: current({ go: 'req' }) },
      { id: 'a', descriptionText: null, features: current({}) })
    expect(merged.features).toEqual(current({ go: 'req' }))
  })
})

describe('withFeatures', () => {
  it('reads features for a row stored before they existed, from the text it kept', () => {
    const rows = new Map([['a', { id: 'a', title: 'React Developer', descriptionText: 'Requirements: - Python.' }]])
    withFeatures(rows)
    expect(rows.get('a').features).toMatchObject({ v: FEATURES_VERSION, skills: { react: 'title', python: 'req' } })
  })

  it('reads again a row whose features are an older version', () => {
    const rows = new Map([['a', { id: 'a', title: 'Go Developer', features: { v: FEATURES_VERSION - 1, skills: {} } }]])
    withFeatures(rows)
    expect(rows.get('a').features.skills).toEqual({ go: 'title' })
  })

  // The ones from normalize.js were read from the full body, which the row
  // no longer holds; reading them again from the clipped text would lose it.
  it('leaves current features alone', () => {
    const kept = current({ kubernetes: 'req' })
    const rows = new Map([['a', { id: 'a', title: 'Engineer', descriptionText: 'nothing', features: kept }]])
    withFeatures(rows)
    expect(rows.get('a').features).toBe(kept)
  })
})
