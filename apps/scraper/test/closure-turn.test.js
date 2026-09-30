import { describe, it, expect } from 'vitest'
import { makeId } from '@jobdekho/core/posting.js'
import { listedIds, missedIds, linkCandidates, closureTurn, CHECK_AFTER_DAYS } from '../src/closure-turn.js'

const NOW = Date.parse('2026-10-01T00:00:00Z')
const daysAgo = (d) => new Date(NOW - d * 86400000).toISOString()
const row = (source, externalId, over = {}) => ({ id: makeId(source, externalId), source, externalId, url: `https://example.com/jobs/${externalId}`, lastSeenAt: daysAgo(0), ...over })

describe('listedIds', () => {
  it('names every posting a source listed, and skips a row without an id', () => {
    const ids = listedIds([{ source: 'a', raw: { externalId: 1 } }, { source: 'a', raw: {} }])
    expect([...ids]).toEqual([makeId('a', '1')])
  })
})

describe('missedIds', () => {
  const rows = [row('greenhouse:x', '1'), row('greenhouse:x', '2'), row('greenhouse:x', '3', { closedAt: daysAgo(1) }), row('workday:y', '4')]

  it('counts a posting a complete source did not list on a clean run', () => {
    const results = [{ name: 'greenhouse:x', ok: true, complete: true }, { name: 'workday:y', ok: true }]
    expect(missedIds(results, rows, new Set([makeId('greenhouse:x', '1')]))).toEqual([makeId('greenhouse:x', '2')])
  })

  // A 429 part way, a failure or a skip may just not have got that far.
  it('counts nothing for a source that failed, stopped short or was skipped', () => {
    for (const result of [{ ok: false, complete: true }, { ok: true, complete: true, note: 'stopped early' }, { ok: true, complete: true, skipped: true }]) {
      expect(missedIds([{ name: 'greenhouse:x', ...result }], rows, new Set())).toEqual([])
    }
  })
})

describe('linkCandidates', () => {
  it('picks postings unseen for a few days but not yet stale, oldest first, and none closed or seen today', () => {
    const rows = [
      row('internshala', '10', { lastSeenAt: daysAgo(CHECK_AFTER_DAYS + 1) }),
      row('internshala', '11', { lastSeenAt: daysAgo(15) }),
      row('internshala', '12', { lastSeenAt: daysAgo(1) }),
      row('internshala', '13', { lastSeenAt: daysAgo(30) }),
      row('internshala', '14', { lastSeenAt: daysAgo(10), closedAt: daysAgo(2) }),
      row('internshala', '15', { lastSeenAt: daysAgo(10) }),
    ]
    const picked = linkCandidates(rows, new Set([makeId('internshala', '15')]), NOW)
    expect(picked.map((r) => r.externalId)).toEqual(['11', '10'])
  })
})

describe('closureTurn', () => {
  it('reports missed, gone and live postings with how many links it checked, never reaching the network', async () => {
    const rows = [row('greenhouse:x', '1'), row('greenhouse:x', '2'), row('internshala', '77777', { lastSeenAt: daysAgo(5) })]
    const db = { corpus: { rows: () => rows } }
    const http = async (url) => {
      if (url.endsWith('/robots.txt')) return { status: 404, text: async () => '' }
      return { status: 404, headers: new Headers(), text: async () => '' }
    }
    const out = await closureTurn({
      db, results: [{ name: 'greenhouse:x', ok: true, complete: true }], items: [{ source: 'greenhouse:x', raw: { externalId: '1' } }],
      seen: new Set(), nowMs: NOW, http,
    })
    expect(out.missed).toEqual([makeId('greenhouse:x', '2')])
    expect(out.gone).toEqual([makeId('internshala', '77777')])
    expect(out.checked).toBe(1)
    expect(out.listed).toEqual([makeId('greenhouse:x', '1')])
  })

  it('checks no link when the budget is spent', async () => {
    const db = { corpus: { rows: () => [row('internshala', '77777', { lastSeenAt: daysAgo(5) })] } }
    const out = await closureTurn({ db, results: [], items: [], seen: new Set(), nowMs: NOW, http: async () => { throw new Error('no network in tests') }, budget: 0 })
    expect(out.checked).toBe(0)
  })
})
