import { describe, it, expect } from 'vitest'
import { loadDefaults } from '@jobdekho/server/api/filters.js'

describe('loadDefaults', () => {
  it('returns empty arrays when readFn throws (file missing)', async () => {
    const readFn = async () => { throw new Error('ENOENT') }
    const result = await loadDefaults(readFn)
    expect(result).toEqual({ includeKeywords: [], excludeKeywords: [], locations: [] })
  })

  it('returns empty arrays when readFn returns malformed JSON', async () => {
    const readFn = async () => 'not-json'
    const result = await loadDefaults(readFn)
    expect(result).toEqual({ includeKeywords: [], excludeKeywords: [], locations: [] })
  })

  it('returns parsed values when readFn returns valid JSON', async () => {
    const data = { includeKeywords: ['intern'], excludeKeywords: ['senior'], locations: ['remote'] }
    const readFn = async () => JSON.stringify(data)
    const result = await loadDefaults(readFn)
    expect(result).toEqual(data)
  })
})
