import { describe, it, expect } from 'vitest'
import { toRow } from '@jobdekho/db/queries.js'

describe('toRow', () => {
  const base = {
    id: 'abc', source: 's', externalId: '1', title: 'T', company: 'C',
    location: 'Remote', url: 'u', descriptionSnippet: 'd', tags: ['x'],
  }
  it('passes through core fields', () => {
    const r = toRow({ ...base, postedAt: '2026-06-01', stipend: '₹ 8,000 /month', duration: '2 Months' })
    expect(r.id).toBe('abc')
    expect(r.tags).toEqual(['x'])
    expect(r.postedAt instanceof Date).toBe(true)
    expect(r.stipend).toBe('₹ 8,000 /month')
    expect(r.duration).toBe('2 Months')
  })
  it('maps missing postedAt to null', () => {
    expect(toRow({ ...base, postedAt: null }).postedAt).toBeNull()
  })
  it('defaults stipend and duration to null when absent', () => {
    const r = toRow({ ...base })
    expect(r.stipend).toBeNull()
    expect(r.duration).toBeNull()
  })
})
