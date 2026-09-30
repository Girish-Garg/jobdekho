import { describe, it, expect } from 'vitest'
import {
  normalizeGuard, planSweep, recordSweep, guardView, pauseAfter, SWEEP_EVERY_MS, FIRST_PAUSE_MS, LONGEST_PAUSE_MS,
} from '../src/linkedin-guard.js'
import { FIRST_SWEEP, DAILY_SWEEP } from '@jobdekho/sources/boards/linkedin-plan.js'

// A fake clock throughout: every rule is checked at hand-picked moments.
const NOW = Date.parse('2026-09-30T12:00:00.000Z')
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const at = (ms) => new Date(ms).toISOString()
const ago = (ms) => at(NOW - ms)
const guard = (over = {}) => ({ lastSweepAt: null, pausedUntil: null, refusals: 0, ...over })
const refused = (retryAfterMs = null) => ({ answered: 4, refusal: { reason: 'HTTP 429', retryAfterMs } })

describe('planSweep', () => {
  it('reads a month at full size the first time', () => {
    expect(planSweep(guard(), NOW)).toEqual({ run: true, sweep: FIRST_SWEEP })
  })

  it('skips LinkedIn for 20 hours after a read, however many refreshes ask', () => {
    const last = guard({ lastSweepAt: ago(5 * HOUR) })
    const until = at(NOW - 5 * HOUR + SWEEP_EVERY_MS)
    expect(planSweep(last, NOW)).toEqual({ run: false, why: 'recent', until, lastSweepAt: last.lastSweepAt })
    expect(planSweep(guard({ lastSweepAt: ago(20 * HOUR - 1) }), NOW).run).toBe(false)
    expect(SWEEP_EVERY_MS).toBe(20 * HOUR)
  })

  it('reads a week at the daily size once 20 hours have passed', () => {
    expect(planSweep(guard({ lastSweepAt: ago(20 * HOUR) }), NOW)).toEqual({ run: true, sweep: DAILY_SWEEP })
    expect(planSweep(guard({ lastSweepAt: ago(6 * DAY) }), NOW).sweep.lookback).toBe('r604800')
  })

  // A computer off for a week: a week's window would miss the days between.
  it('looks back a month, still at the daily size, after a gap longer than the week', () => {
    expect(planSweep(guard({ lastSweepAt: ago(6 * DAY + 1) }), NOW)).toEqual({ run: true, sweep: { ...DAILY_SWEEP, lookback: 'r2592000' } })
  })

  it('skips LinkedIn while a pause runs, and reads it the moment the pause ends', () => {
    const paused = guard({ lastSweepAt: ago(3 * DAY), pausedUntil: at(NOW + HOUR), refusals: 1 })
    expect(planSweep(paused, NOW)).toEqual({ run: false, why: 'paused', until: paused.pausedUntil, lastSweepAt: paused.lastSweepAt })
    expect(planSweep(paused, NOW + HOUR)).toEqual({ run: true, sweep: { ...DAILY_SWEEP, lookback: 'r604800' } })
  })

  it('does not let a read dated in the future hold LinkedIn off', () => {
    expect(planSweep(guard({ lastSweepAt: at(NOW + 30 * DAY) }), NOW)).toEqual({ run: true, sweep: { ...DAILY_SWEEP, lookback: 'r2592000' } })
  })
})

describe('recordSweep', () => {
  it('marks a clean sweep read now, and clears any pause and refusal count', () => {
    const before = guard({ lastSweepAt: ago(3 * DAY), pausedUntil: ago(HOUR), refusals: 2 })
    expect(recordSweep(before, { answered: 60, refusal: null }, NOW)).toEqual({ lastSweepAt: at(NOW), pausedUntil: null, refusals: 0 })
  })

  it('pauses for 48 hours after a refusal', () => {
    expect(recordSweep(guard(), refused(), NOW)).toEqual({ lastSweepAt: at(NOW), pausedUntil: at(NOW + 48 * HOUR), refusals: 1 })
  })

  it('doubles the pause with each refusal in a row, to 14 days at most', () => {
    let g = guard()
    const pauses = []
    for (let i = 0; i < 6; i++) {
      g = recordSweep(g, refused(), NOW)
      pauses.push((Date.parse(g.pausedUntil) - NOW) / DAY)
    }
    expect(pauses).toEqual([2, 4, 8, 14, 14, 14])
    expect(g.refusals).toBe(6)
    expect([FIRST_PAUSE_MS, LONGEST_PAUSE_MS]).toEqual([2 * DAY, 14 * DAY])
  })

  it('starts the doubling again after a clean sweep', () => {
    const cleaned = recordSweep(guard({ refusals: 3 }), { answered: 10 }, NOW)
    expect(recordSweep(cleaned, refused(), NOW).pausedUntil).toBe(at(NOW + 2 * DAY))
  })

  it('never pauses for less than LinkedIn asked, nor less than its own rule', () => {
    expect(recordSweep(guard(), refused(5 * DAY), NOW).pausedUntil).toBe(at(NOW + 5 * DAY))
    expect(recordSweep(guard(), refused(30 * DAY), NOW).pausedUntil).toBe(at(NOW + 30 * DAY))
    expect(recordSweep(guard(), refused(60 * 1000), NOW).pausedUntil).toBe(at(NOW + 2 * DAY))
  })

  // Offline: every request failed before reaching LinkedIn, so nothing was
  // read and the next refresh may try again, still at a first sweep's size.
  it('leaves the guard as it was when no request reached LinkedIn', () => {
    const before = guard({ lastSweepAt: ago(2 * DAY) })
    expect(recordSweep(before, { answered: 0, refusal: null }, NOW)).toBe(before)
    expect(recordSweep(guard(), { answered: 0 }, NOW)).toEqual(guard())
  })

  it('counts an adapter that did not say how it went as a clean read', () => {
    expect(recordSweep(guard(), {}, NOW)).toEqual({ lastSweepAt: at(NOW), pausedUntil: null, refusals: 0 })
    expect(recordSweep(guard(), undefined, NOW).lastSweepAt).toBe(at(NOW))
  })
})

describe('pauseAfter', () => {
  it('is two days for the first refusal, doubling, and never past two weeks', () => {
    expect([1, 2, 3, 4, 10].map((n) => pauseAfter(n) / DAY)).toEqual([2, 4, 8, 14, 14])
  })
})

describe('normalizeGuard', () => {
  it('keeps a well-formed guard as it is', () => {
    const g = { lastSweepAt: ago(HOUR), pausedUntil: at(NOW + DAY), refusals: 2 }
    expect(normalizeGuard(g)).toEqual(g)
  })

  it('reads a missing or damaged file as a guard that has seen nothing', () => {
    expect(normalizeGuard(null)).toEqual(guard())
    expect(normalizeGuard({ lastSweepAt: 'yesterday', pausedUntil: 12, refusals: -1 })).toEqual(guard())
    expect(normalizeGuard({ refusals: 1.5 }).refusals).toBe(0)
  })
})

describe('guardView', () => {
  it('says when LinkedIn was read and the earliest the next read can be', () => {
    const g = guard({ lastSweepAt: ago(5 * HOUR) })
    expect(guardView(g, NOW)).toEqual({ lastSweepAt: g.lastSweepAt, pausedUntil: null, nextAfter: at(NOW + 15 * HOUR) })
  })

  it('names the end of a pause that is still running', () => {
    const g = guard({ lastSweepAt: ago(DAY), pausedUntil: at(NOW + 2 * DAY), refusals: 1 })
    expect(guardView(g, NOW)).toEqual({ lastSweepAt: g.lastSweepAt, pausedUntil: g.pausedUntil, nextAfter: g.pausedUntil })
  })

  it('has no next time when the next refresh would read it', () => {
    expect(guardView(guard(), NOW)).toEqual({ lastSweepAt: null, pausedUntil: null, nextAfter: null })
    const over = guard({ lastSweepAt: ago(3 * DAY), pausedUntil: ago(HOUR), refusals: 1 })
    expect(guardView(over, NOW)).toEqual({ lastSweepAt: over.lastSweepAt, pausedUntil: null, nextAfter: null })
  })
})
