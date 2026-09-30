import { describe, it, expect } from 'vitest'
import { skipNote, shortDay } from '../src/linkedin-note.js'

const NOW = Date.parse('2026-09-30T12:00:00.000Z')
const HOUR = 60 * 60 * 1000
const at = (ms) => new Date(ms).toISOString()

describe('skipNote', () => {
  it('says how long ago LinkedIn was read and how long until the next read', () => {
    const skip = { run: false, why: 'recent', lastSweepAt: at(NOW - 5 * HOUR), until: at(NOW + 15 * HOUR) }
    expect(skipNote(skip, NOW)).toBe('LinkedIn read 5 h ago; next after 15 h')
  })

  it('counts minutes under an hour, and never less than one', () => {
    const skip = { why: 'recent', lastSweepAt: at(NOW - 20 * 1000), until: at(NOW + 40 * 60 * 1000) }
    expect(skipNote(skip, NOW)).toBe('LinkedIn read 1 min ago; next after 40 min')
  })

  // Midday UTC, so the day is the same in any time zone the tests run in.
  it('names the day a pause ends', () => {
    const skip = { why: 'paused', lastSweepAt: at(NOW), until: '2026-10-03T12:00:00.000Z' }
    expect(skipNote(skip, NOW)).toBe('LinkedIn paused until Sat 3 Oct: it refused the last read')
  })
})

describe('shortDay', () => {
  it('is the weekday, the date and the month', () => {
    expect(shortDay('2026-10-02T12:00:00.000Z')).toBe('Fri 2 Oct')
  })
})
