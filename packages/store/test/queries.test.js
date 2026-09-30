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

// LinkedIn's description is fetched once; the next day the same job comes
// back as a bare card, which must not wipe what was read the day before.
describe('a posting seen again without its text', () => {
  it('keeps the stored description and what was read from it, and still refreshes the rest', async () => {
    const store = openStore(dir)
    const card = { id: 'li1', source: 'linkedin', externalId: '1', title: 'Software Engineer Intern', company: 'Acme', url: 'u1', descriptionSnippet: '', descriptionText: '', level: 'mid', type: 'job' }
    await upsertPostings(store, [{ ...card, descriptionSnippet: 'Build it.', descriptionText: 'Build it. Internship.', level: 'internship', type: 'internship' }])
    await upsertPostings(store, [{ ...card, title: 'Software Engineer Intern (Updated)' }])
    const row = store.corpus.byId().get('li1')
    expect(row).toMatchObject({ title: 'Software Engineer Intern (Updated)', descriptionText: 'Build it. Internship.', level: 'internship', type: 'internship' })
  })
})


// A run in which every source only listed postings it already had (a quiet
// day on Workday) sends no items, yet those postings were seen.
describe('upsertPostings with seen ids', () => {
  it('records a sighting even when a run brings nothing new', async () => {
    const store = openStore(dir)
    await upsertPostings(store, [{ ...base, id: 'abc' }], Date.parse('2026-09-01T00:00:00Z'))
    await upsertPostings(store, [], Date.parse('2026-09-20T00:00:00Z'), ['abc'])
    expect(store.corpus.byId().get('abc').lastSeenAt).toBe('2026-09-20T00:00:00.000Z')
  })

  it('stores the logo address a posting came with', async () => {
    const store = openStore(dir)
    await upsertPostings(store, [{ ...base, logoUrl: 'https://media.licdn.com/a.png' }])
    expect(store.corpus.byId().get('abc').logoUrl).toBe('https://media.licdn.com/a.png')
  })
})

// A posting whose link died used to stay in the feed for 21 days and in the
// store for 60. The run now says which are gone (see corpus-closure.js).
describe('upsertPostings with closure', () => {
  it('closes and deletes a posting a complete source missed twice, and keeps a saved one closed', async () => {
    const store = openStore(dir)
    await upsertPostings(store, [{ ...base, id: 'gone' }, { ...base, id: 'kept' }], Date.parse('2026-09-01T00:00:00Z'))
    store.statuses.set('local', { kept: 'saved' })
    const first = await upsertPostings(store, [], Date.parse('2026-09-02T00:00:00Z'), [], { missed: ['gone', 'kept'] })
    expect(first).toEqual({ removed: 0, closed: 0 })
    const second = await upsertPostings(store, [], Date.parse('2026-09-03T00:00:00Z'), [], { missed: ['gone', 'kept'] })
    expect(second).toEqual({ removed: 1, closed: 2 })
    expect(store.corpus.byId().has('gone')).toBe(false)
    expect(store.corpus.byId().get('kept').closedAt).toBe('2026-09-03T00:00:00.000Z')
  })

  it('treats a posting listed but not kept as sighted, so it is never counted as missed', async () => {
    const store = openStore(dir)
    await upsertPostings(store, [{ ...base, id: 'a' }], Date.parse('2026-09-01T00:00:00Z'))
    await upsertPostings(store, [], Date.parse('2026-09-02T00:00:00Z'), [], { missed: ['a'] })
    await upsertPostings(store, [], Date.parse('2026-09-03T00:00:00Z'), [], { listed: ['a'], missed: ['a'] })
    expect(store.corpus.byId().get('a')).not.toHaveProperty('missedRuns')
  })

  it('closes a posting its own link found gone, in the same write', async () => {
    const store = openStore(dir)
    await upsertPostings(store, [{ ...base, id: 'a' }], Date.parse('2026-09-01T00:00:00Z'))
    const out = await upsertPostings(store, [], Date.parse('2026-09-05T00:00:00Z'), [], { gone: ['a'] })
    expect(out).toEqual({ removed: 1, closed: 1 })
  })

  it('stores a published deadline, and only when there is one', () => {
    expect(toRow({ ...base, closesAt: '2026-10-09T23:59:59+05:30' }).closesAt).toBe('2026-10-09T18:29:59.000Z')
    expect(toRow(base)).not.toHaveProperty('closesAt')
  })
})

describe('recordRun with closure counts', () => {
  it('records how many postings closed and how many links were checked, when the run says', async () => {
    const store = openStore(dir)
    await recordRun(store, { id: 'r1', sourceResults: [], newCount: 0, closed: 3, checked: 40 })
    await recordRun(store, { id: 'r2', sourceResults: [], newCount: 0 })
    const [one, two] = store.runs.all()
    expect(one).toMatchObject({ closed: 3, checked: 40 })
    expect(two).not.toHaveProperty('closed')
  })
})
