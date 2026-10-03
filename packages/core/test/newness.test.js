import { describe, it, expect } from 'vitest'
import { newness } from '@jobdekho/core/newness.js'

const NOW = Date.parse('2026-10-04T12:00:00.000Z')
const HOUR = 60 * 60 * 1000
const at = (hoursAgo) => new Date(NOW - hoursAgo * HOUR).toISOString()

describe('newness', () => {
  it('is new when the board posted it within the last day', () => {
    expect(newness({ postedAt: at(2), firstSeenAt: at(1) }, NOW)).toBe('new')
    expect(newness({ postedAt: at(23), firstSeenAt: at(30) }, NOW)).toBe('new')
  })

  // 389 of 914 postings marked New had been posted over a week earlier.
  it('is found today, not new, when first found today but posted earlier or undated', () => {
    expect(newness({ postedAt: at(24 * 8), firstSeenAt: at(3) }, NOW)).toBe('found-today')
    expect(newness({ postedAt: null, firstSeenAt: at(3) }, NOW)).toBe('found-today')
  })

  it('is neither for an older posting, or a date a wrong clock put in the future', () => {
    expect(newness({ postedAt: at(30), firstSeenAt: at(30) }, NOW)).toBeNull()
    expect(newness({ postedAt: at(-48), firstSeenAt: at(48) }, NOW)).toBeNull()
    expect(newness({}, NOW)).toBeNull()
  })
})
