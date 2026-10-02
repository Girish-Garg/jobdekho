import { describe, it, expect } from 'vitest'
import { nextRecord, isPaused, healthView, FAILS_TO_PAUSE, FIRST_PAUSE_MS, LONGEST_PAUSE_MS } from '../src/source-guard.js'
import { startHealthTurn } from '../src/health-turn.js'

const NOW = Date.parse('2026-10-01T06:00:00Z')
const DAY = 24 * 60 * 60 * 1000
const failed = (error) => ({ result: { ok: false, error } })
const fine = (listed, extra = {}) => ({ result: { ok: true, count: listed, ...extra }, listed })

describe('nextRecord', () => {
  it('pauses a source after three failures in a row, doubling each pause after, to two weeks', () => {
    let record = {}
    for (let i = 0; i < FAILS_TO_PAUSE - 1; i++) record = nextRecord(record, failed('fetch failed'), NOW)
    expect(isPaused(record, NOW)).toBe(false)
    record = nextRecord(record, failed('fetch failed'), NOW)
    expect(Date.parse(record.pausedUntil) - NOW).toBe(FIRST_PAUSE_MS)
    record = nextRecord(record, failed('fetch failed'), NOW)
    expect(Date.parse(record.pausedUntil) - NOW).toBe(FIRST_PAUSE_MS * 2)
    for (let i = 0; i < 5; i++) record = nextRecord(record, failed('fetch failed'), NOW)
    expect(Date.parse(record.pausedUntil) - NOW).toBe(LONGEST_PAUSE_MS)
    expect(record.reason).toBe('failing')
  })

  it('rests a board that answers 404 twice for two weeks', () => {
    const once = nextRecord({}, failed('HTTP 404 for https://boards-api.greenhouse.io/v1/boards/x/jobs'), NOW)
    expect(isPaused(once, NOW)).toBe(false)
    const twice = nextRecord(once, failed('HTTP 404 for https://boards-api.greenhouse.io/v1/boards/x/jobs'), NOW)
    expect(twice).toMatchObject({ reason: 'gone' })
    expect(Date.parse(twice.pausedUntil) - NOW).toBe(LONGEST_PAUSE_MS)
  })

  it('backs off at once from a host that answered 429, longer when the run failed', () => {
    expect(Date.parse(nextRecord({}, failed('HTTP 429 for https://x'), NOW).pausedUntil) - NOW).toBe(7 * DAY)
    const cut = nextRecord({}, fine(12, { note: 'stopped early: the careers site answered 429' }), NOW)
    expect(Date.parse(cut.pausedUntil) - NOW).toBe(2 * DAY)
  })

  it('clears the streak on a good run', () => {
    const bad = nextRecord(nextRecord({}, failed('fetch failed'), NOW), failed('fetch failed'), NOW)
    expect(nextRecord(bad, fine(3), NOW)).toMatchObject({ failures: 0, lastError: null, pausedUntil: null })
  })

  it('counts runs listing nothing only for a source that once listed something', () => {
    let record = nextRecord({}, fine(0), NOW)
    expect(record.zeroRuns).toBe(0)
    record = nextRecord(record, fine(5), NOW)
    for (let i = 0; i < 3; i++) record = nextRecord(record, fine(0), NOW)
    expect(record.zeroRuns).toBe(3)
  })

  it('flags a source whose descriptions went missing', () => {
    const had = nextRecord({}, { ...fine(10), body: 0.9 }, NOW)
    expect(nextRecord(had, { ...fine(10), body: 0.1 }, NOW).thin).toBe(true)
    expect(nextRecord(had, { ...fine(10), body: null }, NOW)).toMatchObject({ thin: false, body: 0.9 })
  })
})

describe('healthView', () => {
  it('lists the sources resting and the ones that look wrong', () => {
    const state = {
      'greenhouse:b': { pausedUntil: new Date(NOW + DAY).toISOString(), reason: 'gone', lastError: 'HTTP 404 for x' },
      'greenhouse:a': { zeroRuns: 3 },
      'lever:c': { thin: true },
      'lever:d': { pausedUntil: new Date(NOW - DAY).toISOString() },
    }
    expect(healthView(state, NOW)).toEqual({
      paused: [{ name: 'greenhouse:b', until: state['greenhouse:b'].pausedUntil, reason: 'gone', error: 'HTTP 404 for x' }],
      alerts: [{ name: 'greenhouse:a', kind: 'empty' }, { name: 'lever:c', kind: 'thin' }],
    })
  })
})

describe('startHealthTurn', () => {
  function fakeDb(state) {
    let saved = state
    return { sourceHealth: { get: () => saved, set: (next) => { saved = next } }, read: () => saved }
  }

  it('leaves out a resting source, reports it as skipped with why, and never pauses LinkedIn', () => {
    const until = new Date(NOW + DAY).toISOString()
    const db = fakeDb({ 'greenhouse:x': { pausedUntil: until, reason: 'refused' }, linkedin: { pausedUntil: until } })
    const turn = startHealthTurn({ db, adapters: [{ name: 'greenhouse:x' }, { name: 'lever:y' }, { name: 'linkedin' }], now: () => NOW })
    expect(turn.adapters.map((a) => a.name)).toEqual(['lever:y', 'linkedin'])
    const [skipped] = turn.settle([])
    expect(skipped).toMatchObject({ name: 'greenhouse:x', skipped: true, paused: true, ok: true })
    expect(skipped.note).toMatch(/^Paused until .*: the site answered 429$/)
  })

  // The note reaches the app, where no config/companies.json is the person's to edit.
  it('says a board that is gone answered 404, and names no file to fix it in', () => {
    const db = fakeDb({ 'greenhouse:x': { pausedUntil: new Date(NOW + DAY).toISOString(), reason: 'gone' } })
    const [skipped] = startHealthTurn({ db, adapters: [{ name: 'greenhouse:x' }], now: () => NOW }).settle([])
    expect(skipped.note).toMatch(/^Paused until .*: the board answered 404 twice$/)
  })

  it('records each source it ran, counting postings listed without being sent, and judges bodies on new postings', () => {
    const db = fakeDb({})
    const turn = startHealthTurn({ db, adapters: [{ name: 'workday:x' }], now: () => NOW })
    const fresh = Array.from({ length: 5 }, () => ({ source: 'workday:x', descriptionText: 'word '.repeat(200) }))
    turn.record({ results: [{ name: 'workday:x', ok: true, count: 5 }], listedBy: () => 40, fresh })
    expect(db.read()['workday:x']).toMatchObject({ listed: 45, body: 1, failures: 0 })
  })
})
