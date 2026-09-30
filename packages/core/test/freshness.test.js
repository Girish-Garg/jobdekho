import { describe, it, expect } from 'vitest'
import { outOfDate, postedTooLongAgo, MAX_POSTED_DAYS, MAX_UNLISTED_DAYS } from '@jobdekho/core/freshness.js'

const NOW = Date.parse('2026-09-30T12:00:00.000Z')
const daysAgo = (n) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString()

describe('postedTooLongAgo', () => {
  it('draws the line at two months from the date the board gives', () => {
    expect(MAX_POSTED_DAYS).toBe(60)
    expect(postedTooLongAgo({ postedAt: daysAgo(59) }, NOW)).toBe(false)
    expect(postedTooLongAgo({ postedAt: daysAgo(61) }, NOW)).toBe(true)
  })

  // Judging an undated one by when JobDekho first saw it would drop a
  // still-listed job only for the next scrape to bring it back as new.
  it('never judges a posting with no date, or a date it cannot read', () => {
    expect(postedTooLongAgo({ postedAt: null, firstSeenAt: daysAgo(200) }, NOW)).toBe(false)
    expect(postedTooLongAgo({ postedAt: 'soon' }, NOW)).toBe(false)
  })
})

describe('outOfDate', () => {
  it('is a posting posted over two months ago, even one still listed', () => {
    expect(outOfDate({ postedAt: daysAgo(90), lastSeenAt: daysAgo(0) }, NOW)).toBe(true)
  })

  it('is a posting no board has listed for two months, dated or not', () => {
    expect(MAX_UNLISTED_DAYS).toBe(60)
    expect(outOfDate({ postedAt: null, lastSeenAt: daysAgo(61) }, NOW)).toBe(true)
    expect(outOfDate({ postedAt: null, lastSeenAt: daysAgo(40) }, NOW)).toBe(false)
  })

  it('keeps a recent posting that is still listed', () => {
    expect(outOfDate({ postedAt: daysAgo(10), lastSeenAt: daysAgo(1) }, NOW)).toBe(false)
  })
})
