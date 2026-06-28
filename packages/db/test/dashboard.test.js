import { describe, it, expect } from 'vitest'
import { normalizePrefs, normalizeFilters } from '@jobdekho/db/dashboard.js'

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
