import { describe, it, expect } from 'vitest'
import { makeId } from '@jobdekho/core/posting.js'
import { createRunContext, ETAG_DAYS } from '../src/run-context.js'
import { openMemo } from '../src/source-memo.js'

const NOW = Date.parse('2026-10-01T06:00:00Z')
const DAY = 24 * 60 * 60 * 1000
const iso = (ms) => new Date(ms).toISOString()

function fakeDb(rows = [], memo = null) {
  let kept = memo
  return {
    corpus: { rows: () => rows, byId: () => new Map(rows.map((r) => [r.id, r])) },
    sourceMemo: { get: () => kept, set: (next) => { kept = next } },
    memoFile: () => kept,
  }
}
const row = (source, externalId, over = {}) => ({ id: makeId(source, externalId), source, externalId, descriptionText: 'Body', lastSeenAt: iso(NOW - DAY), ...over })

describe('createRunContext', () => {
  it('counts a posting the store describes as known and seen', () => {
    const db = fakeDb([row('a', '1'), row('a', '2', { descriptionText: null })])
    const run = createRunContext({ db, rules: {}, memo: openMemo(db, {}), now: () => NOW })
    expect(run.context.known('a', '1')).toBe(true)
    expect(run.context.known('a', '2')).toBe(false)
    expect([...run.seen]).toEqual([makeId('a', '1')])
    expect(run.knownBy.get('a')).toBe(1)
  })

  // LinkedIn and the list-then-describe platforms ask before fetching a
  // job's own page: one from a blocked company would only be dropped.
  it('calls a card from a blocked company unwanted, so its page is never fetched', () => {
    const db = fakeDb()
    const rules = { includeKeywords: ['software'], excludeKeywords: [], locations: [] }
    const isBlocked = (posting) => posting.company === 'Fake Corp'
    const run = createRunContext({ db, rules, memo: openMemo(db, rules), now: () => NOW, isBlocked })
    const card = (company, title = 'Software Engineer') => ({ externalId: '1', title, company, url: 'u', location: 'Pune' })
    expect(run.context.wanted('linkedin', card('Fake Corp'))).toBe(false)
    expect(run.context.wanted('linkedin', card('Real Co'))).toBe(true)
    expect(run.context.wanted('linkedin', card('Real Co', 'Chef'))).toBe(false)
  })

  // The pipeline drops a posting dated past the age cut on arrival, so a
  // list row that already says so is not worth its detail request. A row
  // with no date is not judged by one.
  it('calls a card its list dates past the age cut unwanted', () => {
    const db = fakeDb()
    const rules = { includeKeywords: ['software'], excludeKeywords: [], locations: [] }
    const run = createRunContext({ db, rules, memo: openMemo(db, rules), now: () => NOW })
    const card = (postedAt) => ({ externalId: '1', title: 'Software Engineer', company: 'Acme', url: 'u', location: 'Pune', postedAt })
    expect(run.context.wanted('kpit', card(iso(NOW - 61 * DAY)))).toBe(false)
    expect(run.context.wanted('kpit', card(iso(NOW - 59 * DAY)))).toBe(true)
    expect(run.context.wanted('kpit', card(null))).toBe(true)
  })

  // A 304 answers for the read the ETag came from: what that read listed is
  // seen again; what it had already stopped listing stays missing.
  it('on an unchanged board, sees again what its last full read listed, and nothing it had missed', () => {
    const since = iso(NOW - 3 * DAY)
    const rows = [row('gh:x', '1', { lastSeenAt: iso(NOW - DAY) }), row('gh:x', '2', { lastSeenAt: iso(NOW - 5 * DAY) }), row('gh:x', '3', { missedRuns: 1 }), row('gh:x', '4', { closedAt: since })]
    const db = fakeDb(rows, { rules: null, sources: {} })
    const run = createRunContext({ db, rules: {}, memo: openMemo(db, {}), now: () => NOW })
    run.context.unchanged('gh:x', since)
    expect([...run.seen]).toEqual([makeId('gh:x', '1')])
    expect(run.unchanged.has('gh:x')).toBe(true)
  })

  it('offers an ETag only while it can be trusted', () => {
    const at = iso(NOW - DAY)
    const etag = { url: 'https://api/x', value: 'W/"1"', at, stored: 1 }
    const rows = [row('gh:x', '1', { lastSeenAt: iso(NOW - DAY / 2) })]
    const context = (kept, rs = rows) => {
      const db = fakeDb(rs)
      const memo = openMemo(db, {})
      if (kept) memo.keep('gh:x', 'etag', kept)
      return createRunContext({ db, rules: {}, memo, now: () => NOW }).context
    }
    expect(context(etag).etagFor('gh:x', 'https://api/x')).toBe('W/"1"')
    expect(context(etag).etagFor('gh:x', 'https://api/other')).toBeNull()
    expect(context({ ...etag, at: iso(NOW - (ETAG_DAYS + 1) * DAY) }).etagFor('gh:x', 'https://api/x')).toBeNull()
    expect(context(etag, []).etagFor('gh:x', 'https://api/x')).toBeNull()
    expect(context({ ...etag, stored: undefined }).etagFor('gh:x', 'https://api/x')).toBeNull()
  })
})

describe('openMemo', () => {
  it('writes what a run learned only for sources that came through, with what the write left', () => {
    const db = fakeDb()
    const memo = openMemo(db, { a: 1 })
    memo.keep('gh:ok', 'etag', { url: 'u', value: 'v', at: 't' })
    memo.keep('gh:failed', 'etag', { url: 'u', value: 'v', at: 't' })
    memo.commit(new Set(['gh:ok']), (source, key, value) => ({ ...value, stored: 4 }))
    expect(db.memoFile().sources).toEqual({ 'gh:ok': { etag: { url: 'u', value: 'v', at: 't', stored: 4 } } })
  })

  // A board that answers "unchanged" is not read again, so new relevance
  // rules would never reach its postings while it stayed so.
  it('forgets everything when the relevance rules change', () => {
    const db = fakeDb()
    const first = openMemo(db, { includeKeywords: ['a'] })
    first.keep('gh:x', 'etag', { value: 'v' })
    first.commit(new Set(['gh:x']))
    expect(openMemo(db, { includeKeywords: ['a'] }).recall('gh:x', 'etag')).toEqual({ value: 'v' })
    expect(openMemo(db, { includeKeywords: ['b'] }).recall('gh:x', 'etag')).toBeNull()
  })
})
