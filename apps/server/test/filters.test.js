import { describe, it, expect } from 'vitest'
import { loadDefaults, coerceFilters } from '@jobdekho/server/api/filters.js'

const EMPTY = { includeKeywords: [], excludeKeywords: [], locations: [], levels: [], maxDegree: null }

describe('loadDefaults', () => {
  it('returns empty arrays when readFn throws (file missing)', async () => {
    const readFn = async () => { throw new Error('ENOENT') }
    const result = await loadDefaults(readFn)
    expect(result).toEqual(EMPTY)
  })

  it('returns empty arrays when readFn returns malformed JSON', async () => {
    const readFn = async () => 'not-json'
    const result = await loadDefaults(readFn)
    expect(result).toEqual(EMPTY)
  })

  it('returns parsed values when readFn returns valid JSON', async () => {
    const data = {
      includeKeywords: ['intern'], excludeKeywords: ['senior'], locations: ['remote'],
      levels: ['internship', 'entry'], maxDegree: 'bachelors',
    }
    const readFn = async () => JSON.stringify(data)
    const result = await loadDefaults(readFn)
    expect(result).toEqual(data)
  })

  it('falls back safely when the config predates levels and maxDegree', async () => {
    const readFn = async () => JSON.stringify({ includeKeywords: ['intern'], locations: [] })
    const result = await loadDefaults(readFn)
    expect(result.levels).toEqual([])
    expect(result.maxDegree).toBeNull()
    expect(result.excludeKeywords).toEqual([])
  })

  it('ignores config keys it does not surface', async () => {
    const readFn = async () => JSON.stringify({ internshipOnly: true, includeKeywords: [] })
    const result = await loadDefaults(readFn)
    expect(result).toEqual(EMPTY)
  })

  it('reads the real config file when no readFn is given', async () => {
    const result = await loadDefaults()
    expect(result.includeKeywords.length).toBeGreaterThan(0)
    expect(Array.isArray(result.levels)).toBe(true)
  })
})

describe('coerceFilters', () => {
  it('returns every column with a safe default for an empty body', () => {
    expect(coerceFilters({})).toEqual({
      includeKeywords: [], excludeKeywords: [], locations: [], levels: [], sources: [],
      excludedSources: [], workModes: [],
      maxDegree: null, minStipend: null, maxDurationMonths: null, maxExperienceYears: null,
    })
  })

  it('handles a missing body', () => {
    expect(coerceFilters(undefined).levels).toEqual([])
  })

  it('keeps valid values', () => {
    const out = coerceFilters({
      includeKeywords: ['react'], levels: ['internship', 'executive'],
      maxDegree: 'phd', minStipend: 10000, maxDurationMonths: 3, maxExperienceYears: 0,
    })
    expect(out.includeKeywords).toEqual(['react'])
    expect(out.levels).toEqual(['internship', 'executive'])
    expect(out.maxDegree).toBe('phd')
    expect(out.minStipend).toBe(10000)
    expect(out.maxExperienceYears).toBe(0)
  })

  it('turns a scalar sent for an array column into an empty array', () => {
    const out = coerceFilters({ locations: 'pune', levels: 'senior' })
    expect(out.locations).toEqual([])
    expect(out.levels).toEqual([])
  })

  it('parses numeric strings and rejects junk', () => {
    const out = coerceFilters({ minStipend: '15000', maxDurationMonths: 'six', maxExperienceYears: '' })
    expect(out.minStipend).toBe(15000)
    expect(out.maxDurationMonths).toBeNull()
    expect(out.maxExperienceYears).toBeNull()
  })

  it('drops unknown levels rather than rejecting the whole body', () => {
    expect(coerceFilters({ levels: ['mid', 'wizard'] }).levels).toEqual(['mid'])
  })

  it('nulls an unknown maxDegree', () => {
    expect(coerceFilters({ maxDegree: 'bootcamp' }).maxDegree).toBeNull()
    expect(coerceFilters({ maxDegree: null }).maxDegree).toBeNull()
  })

  it('ignores keys that are not filter columns', () => {
    expect(coerceFilters({ userId: 'someone-else' })).not.toHaveProperty('userId')
  })
})
