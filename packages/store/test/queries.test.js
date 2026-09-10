import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore, FILES } from '@jobdekho/store/open.js'
import { toRow, getExistingIds, upsertPostings, recordRun } from '@jobdekho/store/queries.js'

let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-store-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }); vi.useRealTimers() })

const base = {
  id: 'abc', source: 's', externalId: '1', title: 'T', company: 'C',
  location: 'Remote', url: 'u', descriptionSnippet: 'd', tags: ['x'],
}

describe('toRow', () => {
  it('stores timestamps as canonical ISO strings and unparseable ones as null', () => {
    expect(toRow({ ...base, postedAt: '2026-06-01' }).postedAt).toBe('2026-06-01T00:00:00.000Z')
    expect(toRow({ ...base, postedAt: 'yesterday-ish' }).postedAt).toBeNull()
    expect(toRow({ ...base, postedAt: null }).postedAt).toBeNull()
    expect(toRow({ ...base }).lastSeenAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/)
  })

  it('fills the defaults the NOT NULL columns used to supply', () => {
    const r = toRow({ id: 'a', source: 's', externalId: '1', title: 'T', company: 'C', url: 'u' })
    expect(r).toMatchObject({
      location: '', descriptionSnippet: '', descriptionText: null, tags: [],
      level: 'mid', degreeMin: 'none', degreeRequired: false, workMode: 'onsite', type: 'job',
      stipend: null, stipendMin: null, currency: null, groupKey: null,
    })
    expect('firstSeenAt' in r).toBe(false)
  })

  it('derives type from level unless the caller supplies one', () => {
    expect(toRow({ ...base, level: 'internship' }).type).toBe('internship')
    expect(toRow({ ...base, level: 'entry', type: 'internship' }).type).toBe('internship')
  })
})

describe('getExistingIds', () => {
  it('answers with only the ids the corpus holds', async () => {
    const store = openStore(dir)
    await upsertPostings(store, [{ ...base, id: 'a' }, { ...base, id: 'b' }])
    expect(await getExistingIds(store, ['a', 'c', 'b'])).toEqual(new Set(['a', 'b']))
    expect(await getExistingIds(store, [])).toEqual(new Set())
  })
})

describe('upsertPostings', () => {
  it('writes nothing for an empty run', async () => {
    const store = openStore(dir)
    await upsertPostings(store, [])
    expect(existsSync(join(dir, FILES.corpus))).toBe(false)
  })

  it('stamps firstSeenAt and lastSeenAt on insert', async () => {
    vi.useFakeTimers({ now: new Date('2026-09-01T10:00:00Z'), toFake: ['Date'] })
    const store = openStore(dir)
    await upsertPostings(store, [base])
    const [row] = store.corpus.rows()
    expect(row.firstSeenAt).toBe('2026-09-01T10:00:00.000Z')
    expect(row.lastSeenAt).toBe('2026-09-01T10:00:00.000Z')
  })

  it('refreshes what a re-scrape may correct and never firstSeenAt', async () => {
    vi.useFakeTimers({ now: new Date('2026-09-01T10:00:00Z'), toFake: ['Date'] })
    const store = openStore(dir)
    await upsertPostings(store, [{ ...base, title: 'Old Title', descriptionText: 'old', stipendMin: 5 }])
    vi.setSystemTime(new Date('2026-09-08T10:00:00Z'))
    await upsertPostings(store, [{
      ...base, title: 'Fixed Title', descriptionText: 'new', stipendMin: 9, groupKey: 'g', source: 'other',
    }])
    const [row] = store.corpus.rows()
    expect(row).toMatchObject({ title: 'Fixed Title', descriptionText: 'new', stipendMin: 9, groupKey: 'g' })
    expect(row.firstSeenAt).toBe('2026-09-01T10:00:00.000Z')
    expect(row.lastSeenAt).toBe('2026-09-08T10:00:00.000Z')
    // The conflict key and what it was keyed on are not a re-scrape's to change.
    expect(row.source).toBe('s')
    expect(store.corpus.rows()).toHaveLength(1)
  })

  it('survives a reload with the same rows', async () => {
    const store = openStore(dir)
    await upsertPostings(store, [{ ...base, id: 'a' }, { ...base, id: 'b', title: 'B' }])
    const reopened = openStore(dir)
    expect(reopened.corpus.rows().map((r) => [r.id, r.title])).toEqual([['a', 'T'], ['b', 'B']])
  })
})

describe('recordRun', () => {
  it('appends one line per run with when it started', async () => {
    vi.useFakeTimers({ now: new Date('2026-09-01T10:00:00Z'), toFake: ['Date'] })
    const store = openStore(dir)
    await recordRun(store, { id: 'r1', sourceResults: [{ name: 's', ok: true, count: 2 }], newCount: 2 })
    await recordRun(store, { id: 'r2', sourceResults: [], newCount: 0 })
    const lines = readFileSync(join(dir, FILES.runs), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    expect(lines).toEqual([
      { id: 'r1', startedAt: '2026-09-01T10:00:00.000Z', sourceResults: [{ name: 's', ok: true, count: 2 }], newCount: 2 },
      { id: 'r2', startedAt: '2026-09-01T10:00:00.000Z', sourceResults: [], newCount: 0 },
    ])
    expect(store.runs.all()).toEqual(lines)
  })
})
