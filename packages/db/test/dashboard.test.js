import { describe, it, expect } from 'vitest'
import { normalizePrefs, normalizeFilters, applyStatusFilter } from '@jobdekho/db/dashboard.js'

describe('normalizePrefs', () => {
  it('fills all defaults when called with empty object', () => {
    const p = normalizePrefs({})
    expect(p.channel).toBe('none')
    expect(p.telegramChatId).toBeNull()
    expect(p.email).toBeNull()
    expect(p.enabled).toBe(true)
  })
  it('preserves provided values over defaults', () => {
    const p = normalizePrefs({ channel: 'telegram', telegramChatId: '123', enabled: false })
    expect(p.channel).toBe('telegram')
    expect(p.telegramChatId).toBe('123')
    expect(p.enabled).toBe(false)
    expect(p.email).toBeNull()
  })
  it('handles null input gracefully', () => {
    const p = normalizePrefs(null)
    expect(p.channel).toBe('none')
    expect(p.enabled).toBe(true)
  })
})

describe('normalizeFilters', () => {
  it('fills all array defaults when called with empty object', () => {
    const f = normalizeFilters({})
    expect(f.includeKeywords).toEqual([])
    expect(f.excludeKeywords).toEqual([])
    expect(f.locations).toEqual([])
  })
  it('preserves provided arrays', () => {
    const f = normalizeFilters({ includeKeywords: ['react'], locations: ['remote'] })
    expect(f.includeKeywords).toEqual(['react'])
    expect(f.excludeKeywords).toEqual([])
    expect(f.locations).toEqual(['remote'])
  })
  it('handles null input gracefully', () => {
    const f = normalizeFilters(null)
    expect(f.includeKeywords).toEqual([])
    expect(f.excludeKeywords).toEqual([])
    expect(f.locations).toEqual([])
  })
})

describe('applyStatusFilter', () => {
  const mockRows = [
    { id: 1, status: undefined },
    { id: 2, status: null },
    { id: 3, status: 'saved' },
    { id: 4, status: 'applied' },
    { id: 5, status: 'dismissed' },
  ]

  it('normalizes and returns all rows when status is undefined', () => {
    const result = applyStatusFilter(mockRows, undefined)
    expect(result).toHaveLength(5)
    expect(result[0].status).toBe(null)
    expect(result[1].status).toBe(null)
    expect(result[2].status).toBe('saved')
    expect(result[3].status).toBe('applied')
    expect(result[4].status).toBe('dismissed')
  })

  it('filters to only unactioned rows when status is null', () => {
    const result = applyStatusFilter(mockRows, null)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe(1)
    expect(result[1].id).toBe(2)
    expect(result.every((r) => r.status === null)).toBe(true)
  })

  it('filters to only saved rows when status is "saved"', () => {
    const result = applyStatusFilter(mockRows, 'saved')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(3)
    expect(result[0].status).toBe('saved')
  })

  it('filters to only applied rows when status is "applied"', () => {
    const result = applyStatusFilter(mockRows, 'applied')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(4)
    expect(result[0].status).toBe('applied')
  })

  it('filters to only dismissed rows when status is "dismissed"', () => {
    const result = applyStatusFilter(mockRows, 'dismissed')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(5)
    expect(result[0].status).toBe('dismissed')
  })

  it('returns empty array when filtering for non-existent status', () => {
    const result = applyStatusFilter(mockRows, 'nonexistent')
    expect(result).toHaveLength(0)
  })

  it('preserves other row properties during normalization', () => {
    const rowsWithExtra = [{ id: 1, title: 'Test', status: undefined }]
    const result = applyStatusFilter(rowsWithExtra, undefined)
    expect(result[0].id).toBe(1)
    expect(result[0].title).toBe('Test')
    expect(result[0].status).toBe(null)
  })
})
