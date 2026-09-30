import { describe, it, expect } from 'vitest'
import { applyClosure, MISSES_TO_CLOSE } from '@jobdekho/store/corpus-closure.js'
import { pruneRows } from '@jobdekho/store/corpus-prune.js'

const NOW = '2026-10-01T06:00:00.000Z'
const row = (id, over = {}) => ({ id, source: 'greenhouse:acme', lastSeenAt: '2026-09-30T06:00:00.000Z', ...over })
const rowsOf = (...rows) => new Map(rows.map((r) => [r.id, r]))

describe('applyClosure', () => {
  it('counts a miss from a complete source, and closes on the second in a row', () => {
    const rows = rowsOf(row('a'))
    expect(applyClosure(rows, { missed: ['a'] }, NOW)).toBe(0)
    expect(rows.get('a')).toMatchObject({ missedRuns: 1 })
    expect(rows.get('a').closedAt).toBeUndefined()
    expect(applyClosure(rows, { missed: ['a'] }, NOW)).toBe(1)
    expect(rows.get('a')).toMatchObject({ missedRuns: MISSES_TO_CLOSE, closedAt: NOW })
  })

  it('lets a sighting clear the count and reopen a posting closed by mistake', () => {
    const rows = rowsOf(row('a', { missedRuns: 1 }), row('b', { missedRuns: 2, closedAt: NOW }))
    applyClosure(rows, { sighted: ['a', 'b'] }, NOW)
    expect(rows.get('a')).not.toHaveProperty('missedRuns')
    expect(rows.get('b')).not.toHaveProperty('closedAt')
  })

  it('never counts a miss against a posting sighted in the same run', () => {
    const rows = rowsOf(row('a'))
    applyClosure(rows, { sighted: ['a'], missed: ['a'] }, NOW)
    expect(rows.get('a')).not.toHaveProperty('missedRuns')
  })

  it('closes a posting whose own link said it is gone, once', () => {
    const rows = rowsOf(row('a'), row('b', { closedAt: '2026-09-29T00:00:00.000Z' }))
    expect(applyClosure(rows, { gone: ['a', 'b', 'missing'] }, NOW)).toBe(1)
    expect(rows.get('a').closedAt).toBe(NOW)
    expect(rows.get('b').closedAt).toBe('2026-09-29T00:00:00.000Z')
  })

  // Unstop publishes when registration ends; past it, the posting is closed
  // without a request, unless the board listed it again today.
  it('closes a posting whose published deadline has passed, unless it was listed today', () => {
    const rows = rowsOf(row('past', { closesAt: '2026-09-30T23:59:59.000Z' }), row('future', { closesAt: '2026-10-09T00:00:00.000Z' }), row('listed', { closesAt: '2026-09-01T00:00:00.000Z' }))
    expect(applyClosure(rows, { sighted: ['listed'] }, NOW)).toBe(1)
    expect(rows.get('past').closedAt).toBe(NOW)
    expect(rows.get('future')).not.toHaveProperty('closedAt')
    expect(rows.get('listed')).not.toHaveProperty('closedAt')
  })
})

describe('pruneRows and closed postings', () => {
  it('deletes a closed posting unless the person did something with it', () => {
    const rows = rowsOf(row('gone', { closedAt: NOW }), row('saved', { closedAt: NOW }), row('open'))
    const { rows: next, removed } = pruneRows(rows, { keep: new Set(['saved']), now: Date.parse(NOW) })
    expect([...next.keys()]).toEqual(['saved', 'open'])
    expect(removed).toBe(1)
  })
})
