import { describe, it, expect } from 'vitest'
import { clampPage, toNumber, isFresh, searchMatcher, postingPredicate, blockedMatcher, STALE_AFTER_DAYS } from '@jobdekho/store/posting-filters.js'

const matchesSearch = (row, q) => searchMatcher(q)(row)
import { orderFor, groupOrder, SORTS } from '@jobdekho/store/posting-order.js'

describe('clampPage', () => {
  it('defaults, clamps and coerces', () => {
    expect(clampPage()).toEqual({ limit: 500, offset: 0 })
    expect(clampPage({ limit: '20', offset: '5' })).toEqual({ limit: 20, offset: 5 })
    expect(clampPage({ limit: 5000, offset: -3 })).toEqual({ limit: 1000, offset: 0 })
    expect(clampPage({ limit: 'x', offset: 'y' })).toEqual({ limit: 500, offset: 0 })
  })
})

describe('toNumber', () => {
  it('reads the strings a query carries and rejects the rest', () => {
    expect(toNumber('15000')).toBe(15000)
    expect(toNumber(0)).toBe(0)
    expect(toNumber('')).toBeNull()
    expect(toNumber(undefined)).toBeNull()
    expect(toNumber('soon')).toBeNull()
  })
})

describe('isFresh', () => {
  it('keeps null, keeps the cutoff itself, drops older', () => {
    const cutoff = '2026-09-01T00:00:00.000Z'
    expect(isFresh({ lastSeenAt: null }, cutoff)).toBe(true)
    expect(isFresh({ lastSeenAt: cutoff }, cutoff)).toBe(true)
    expect(isFresh({ lastSeenAt: '2026-08-31T23:59:59.999Z' }, cutoff)).toBe(false)
    expect(STALE_AFTER_DAYS).toBe(21)
  })
})

describe('matchesSearch', () => {
  it('falls back to a literal, case-insensitive title or company match for unknown words', () => {
    expect(matchesSearch({ title: 'Quantum Analyst', company: 'X' }, 'QUANTUM')).toBe(true)
    expect(matchesSearch({ title: 'Analyst', company: 'Quantum Labs' }, 'quantum')).toBe(true)
    expect(matchesSearch({ title: 'Analyst', company: 'X' }, 'quantum')).toBe(false)
  })

  it('expands a family query across the title only', () => {
    expect(matchesSearch({ title: 'Backend Engineer', company: 'X' }, 'web dev')).toBe(true)
    expect(matchesSearch({ title: 'Chef', company: 'Backend Bakery' }, 'web dev')).toBe(false)
  })
})

describe('postingPredicate', () => {
  it('reads null level, work mode and degree as the old defaults', () => {
    const row = { id: 'a', source: 's', title: 'T', tags: [], descriptionSnippet: '', level: null, workMode: null, degreeMin: null, lastSeenAt: null }
    const passes = (opts) => postingPredicate(opts, () => null)(row)
    expect(passes({ levels: ['mid'] })).toBe(true)
    expect(passes({ levels: ['senior'] })).toBe(false)
    expect(passes({ workModes: ['onsite'] })).toBe(true)
    expect(passes({ workModes: ['remote'] })).toBe(false)
    expect(passes({ maxDegree: 'bachelors' })).toBe(true)
  })

  // A closed posting is only still stored because the person saved, applied
  // to or otherwise used it: it leaves the feed, but their own list keeps it,
  // however long ago it was last seen.
  it('leaves a closed posting out of the feed but keeps it in a status list', () => {
    const now = Date.parse('2026-10-01T00:00:00Z')
    const closed = { id: 'c', source: 's', title: 'T', tags: [], descriptionSnippet: '', lastSeenAt: '2026-08-01T00:00:00.000Z', closedAt: '2026-09-01T00:00:00.000Z' }
    const statusOf = () => 'saved'
    expect(postingPredicate({}, statusOf, now)(closed)).toBe(false)
    expect(postingPredicate({ status: 'saved' }, statusOf, now)(closed)).toBe(true)
    expect(postingPredicate({ status: 'applied' }, statusOf, now)(closed)).toBe(false)
    expect(postingPredicate({ includeStale: true }, statusOf, now)(closed)).toBe(true)
  })

  // A blocked company is out whatever else is asked: picked by name, saved,
  // searched for, stale ones included.
  it('leaves out a blocked company under every spelling, whatever the other options', () => {
    const job = (company) => ({ id: company, source: 's', company, title: 'Engineer', tags: [], descriptionSnippet: '', lastSeenAt: null })
    const opts = { blockedKeys: new Set(['phonepe', 'westerndigital']) }
    const saved = () => 'saved'
    for (const company of ['PHONEPE LIMITED', 'PhonePe', 'PhonePeLimited', 'WesternDigital', 'Western Digital Corp']) {
      expect(postingPredicate(opts, saved)(job(company)), company).toBe(false)
      expect(postingPredicate({ ...opts, companies: [company], status: 'saved', includeStale: true, q: 'engineer' }, saved)(job(company))).toBe(false)
    }
    expect(postingPredicate(opts, saved)(job('Razorpay'))).toBe(true)
  })
})

describe('blockedMatcher', () => {
  it('matches by the run-together key, and is no filter at all with nothing blocked', () => {
    const matches = blockedMatcher(new Set(['grafanalabs']))
    expect(matches({ company: 'Grafana Labs' })).toBe(true)
    expect(matches({ company: 'grafanalabs' })).toBe(true)
    expect(matches({ company: 'Grafana' })).toBe(false)
    expect(matches({})).toBe(false)
    expect(blockedMatcher(new Set())).toBeNull()
    expect(blockedMatcher(undefined)).toBeNull()
  })
})

describe('orderFor', () => {
  // The API validates ?sort= against this same constant, so the two cannot
  // drift. What can drift is the web's sort menu, which sends these strings.
  it('offers the sorts the web sort menu sends', () => {
    expect(SORTS).toEqual(['newest', 'oldest', 'added', 'company', 'match'])
  })

  it('falls back to newest for an unknown sort and puts undated rows last either way', () => {
    const rows = [{ id: '1', postedAt: null }, { id: '2', postedAt: '2026-01-01T00:00:00.000Z' }, { id: '3', postedAt: '2026-02-01T00:00:00.000Z' }]
    expect([...rows].sort(orderFor('bogus')).map((r) => r.id)).toEqual(['3', '2', '1'])
    expect([...rows].sort(orderFor('oldest')).map((r) => r.id)).toEqual(['2', '3', '1'])
  })

  it('ranks by score, then newest, then id', () => {
    const rows = [
      { id: '1', matchScore: 50, postedAt: '2026-01-01T00:00:00.000Z' },
      { id: '2', matchScore: 80, postedAt: '2026-01-01T00:00:00.000Z' },
      { id: '3', matchScore: 80, postedAt: '2026-02-01T00:00:00.000Z' },
      { id: '4', matchScore: 80, postedAt: '2026-02-01T00:00:00.000Z' },
    ]
    expect([...rows].sort(orderFor('match')).map((r) => r.id)).toEqual(['4', '3', '2', '1'])
  })
})

// Best fit is the order under every sort: the grade band first, and the
// picked order only within a band (see posting-order.js).
describe('orderFor with grade bands', () => {
  // Scores that sit in the same bands under any floors tried so far.
  const rows = [
    { id: 'b-new', matchScore: 52, postedAt: '2026-03-01T00:00:00.000Z', company: 'Alpha' },
    { id: 'a-old', matchScore: 80, postedAt: '2026-01-01T00:00:00.000Z', company: 'Zeta' },
    { id: 'a-new', matchScore: 75, postedAt: '2026-02-01T00:00:00.000Z', company: 'Beta' },
    { id: 'f', matchScore: 3, postedAt: '2026-04-01T00:00:00.000Z', company: 'Aardvark' },
  ]
  const sorted = (sort, opts) => [...rows].sort(orderFor(sort, opts)).map((r) => r.id)

  it('keeps every A ahead of every B, whatever the picked order', () => {
    expect(sorted('newest')).toEqual(['a-new', 'a-old', 'b-new', 'f'])
    expect(sorted('company')).toEqual(['a-new', 'a-old', 'b-new', 'f'])
    expect(sorted('oldest')).toEqual(['a-old', 'a-new', 'b-new', 'f'])
  })

  it('orders a band by score when nothing is picked', () => {
    expect(sorted('match')).toEqual(['a-old', 'a-new', 'b-new', 'f'])
  })

  it('has no bands where nothing could be ranked', () => {
    expect(sorted('newest', { ranked: false })).toEqual(['f', 'b-new', 'a-new', 'a-old'])
  })
})

describe('groupOrder', () => {
  it('prefers a company board, then the newer posting, then the higher id', () => {
    const rows = [
      { id: '1', source: 'linkedin', postedAt: '2026-03-01T00:00:00.000Z' },
      { id: '2', source: 'lever:acme', postedAt: '2026-01-01T00:00:00.000Z' },
      { id: '3', source: 'greenhouse:acme', postedAt: '2026-02-01T00:00:00.000Z' },
      { id: '4', source: 'greenhouse:acme', postedAt: '2026-02-01T00:00:00.000Z' },
    ]
    expect([...rows].sort(groupOrder).map((r) => r.id)).toEqual(['4', '3', '2', '1'])
  })
})
