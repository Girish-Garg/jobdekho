import { describe, it, expect } from 'vitest'
import { toRow } from '@jobdekho/db/queries.js'

describe('toRow', () => {
  const base = {
    id: 'abc', source: 's', externalId: '1', title: 'T', company: 'C',
    location: 'Remote', url: 'u', descriptionSnippet: 'd', tags: ['x'],
  }
  it('passes through core fields', () => {
    const r = toRow({ ...base, postedAt: '2026-06-01' })
    expect(r.id).toBe('abc')
    expect(r.tags).toEqual(['x'])
    expect(r.postedAt instanceof Date).toBe(true)
  })
  it('maps missing postedAt to null', () => {
    expect(toRow({ ...base, postedAt: null }).postedAt).toBeNull()
  })
})
