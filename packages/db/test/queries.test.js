import { describe, it, expect } from 'vitest'
import { toRow, refreshSet, upsertPostings } from '@jobdekho/db/queries.js'
import { postings } from '@jobdekho/db/schema.js'

describe('toRow', () => {
  const base = {
    id: 'abc', source: 's', externalId: '1', title: 'T', company: 'C',
    location: 'Remote', url: 'u', descriptionSnippet: 'd', tags: ['x'],
  }
  it('passes through core fields', () => {
    const r = toRow({ ...base, postedAt: '2026-06-01', stipend: '₹ 8,000 /month', duration: '2 Months' })
    expect(r.id).toBe('abc')
    expect(r.tags).toEqual(['x'])
    expect(r.postedAt instanceof Date).toBe(true)
    expect(r.stipend).toBe('₹ 8,000 /month')
    expect(r.duration).toBe('2 Months')
  })
  it('maps missing postedAt to null', () => {
    expect(toRow({ ...base, postedAt: null }).postedAt).toBeNull()
  })
  it('defaults stipend and duration to null when absent', () => {
    const r = toRow({ ...base })
    expect(r.stipend).toBeNull()
    expect(r.duration).toBeNull()
  })
  it('passes the taxonomy fields through', () => {
    const r = toRow({ ...base, level: 'senior', degreeMin: 'masters', degreeRequired: true })
    expect(r.level).toBe('senior')
    expect(r.degreeMin).toBe('masters')
    expect(r.degreeRequired).toBe(true)
  })
  it('defaults an unclassified posting to mid level with no degree floor', () => {
    const r = toRow({ ...base })
    expect(r.level).toBe('mid')
    expect(r.degreeMin).toBe('none')
    expect(r.degreeRequired).toBe(false)
  })
  it('keeps degreeRequired false when the degree is only preferred', () => {
    expect(toRow({ ...base, degreeMin: 'bachelors', degreeRequired: false }).degreeRequired).toBe(false)
  })
  it('derives type from level when the caller supplies none', () => {
    expect(toRow({ ...base, level: 'internship' }).type).toBe('internship')
    expect(toRow({ ...base, level: 'staff' }).type).toBe('job')
    expect(toRow({ ...base }).type).toBe('job')
  })
  it('prefers an explicit type over the derived one', () => {
    expect(toRow({ ...base, level: 'entry', type: 'internship' }).type).toBe('internship')
  })
  it('passes the currency through, and defaults it to null when absent', () => {
    expect(toRow({ ...base, currency: 'USD' }).currency).toBe('USD')
    expect(toRow({ ...base }).currency).toBeNull()
  })
  // The scorer reads this text; a row from before the column reads NULL, which
  // is distinguishable from a posting that truly had no description.
  it('passes descriptionText through, and defaults it to null when absent', () => {
    expect(toRow({ ...base, descriptionText: 'full body text' }).descriptionText).toBe('full body text')
    expect(toRow({ ...base }).descriptionText).toBeNull()
  })
})

describe('refreshSet', () => {
  // A re-scrape must be able to repair rows an adapter previously got wrong.
  it('refreshes the fields a re-scrape can correct', () => {
    const keys = Object.keys(refreshSet())
    expect(keys).toContain('descriptionSnippet')
    expect(keys).toContain('location')
    expect(keys).toContain('level')
    expect(keys).toContain('degreeMin')
  })

  // firstSeenAt is what "new today" is measured from; id is the conflict key.
  it('never touches firstSeenAt or id', () => {
    const keys = Object.keys(refreshSet())
    expect(keys).not.toContain('firstSeenAt')
    expect(keys).not.toContain('id')
  })

  // A currency detected wrong on first scrape (or not detected at all, before
  // core learned to) has to be correctable the same way every other field is.
  it('refreshes currency', () => {
    expect(Object.keys(refreshSet())).toContain('currency')
  })

  // Old rows carry NULL and only a re-scrape can fill them, so the upsert has
  // to refresh this or the ranking would stay snippet-blind forever.
  it('refreshes descriptionText', () => {
    expect(Object.keys(refreshSet())).toContain('descriptionText')
    const sql = refreshSet(['descriptionText']).descriptionText
    expect(JSON.stringify(sql)).toContain('excluded.description_text')
  })

  // The schema property is camelCase but the excluded reference has to name the
  // real column, so the two spellings must not drift apart.
  it('maps each key to its excluded column', () => {
    const sql = refreshSet(['descriptionSnippet']).descriptionSnippet
    expect(JSON.stringify(sql)).toContain('excluded.description_snippet')
  })
})

describe('upsertPostings', () => {
  it('does not touch the database for an empty batch', async () => {
    let called = false
    await upsertPostings({ insert: () => { called = true } }, [])
    expect(called).toBe(false)
  })

  it('updates on conflict rather than skipping the row', async () => {
    let conflict = null
    const db = {
      insert: () => ({ values: () => ({ onConflictDoUpdate: (arg) => { conflict = arg } }) }),
    }
    await upsertPostings(db, [{ id: 'a', tags: [] }])
    expect(conflict.set.title).toBeDefined()
  })

  // Postgres caps bind parameters per statement, so a scrape big enough to
  // blow past it (~2600+ rows at 25 columns each) has to be split into several
  // inserts rather than sent as one, or the whole run's data is rejected at once.
  it('splits a large batch into multiple statements', async () => {
    const batches = []
    const db = {
      insert: () => ({
        values: (rows) => { batches.push(rows); return { onConflictDoUpdate: () => {} } },
      }),
    }
    const items = Array.from({ length: 1200 }, (_, i) => ({ id: `p${i}`, tags: [] }))
    await upsertPostings(db, items)
    expect(batches.length).toBe(3)
    expect(batches.map((b) => b.length)).toEqual([500, 500, 200])
  })

  // Splitting into statements must not drop or duplicate a row, and every
  // batch must keep the identical conflict/refresh behaviour as a single insert.
  it('carries every row through across batches with identical conflict behaviour', async () => {
    const calls = []
    const db = {
      insert: () => ({
        values: (rows) => ({
          onConflictDoUpdate: (arg) => { calls.push({ rows, conflict: arg }) },
        }),
      }),
    }
    const items = Array.from({ length: 1200 }, (_, i) => ({ id: `p${i}`, tags: [] }))
    await upsertPostings(db, items)

    const ids = calls.flatMap((c) => c.rows.map((r) => r.id))
    expect(ids.length).toBe(1200)
    expect(new Set(ids).size).toBe(1200)

    for (const { conflict } of calls) {
      expect(conflict.target).toBe(postings.id)
      expect(Object.keys(conflict.set)).toEqual(Object.keys(refreshSet()))
    }
  })

  it('is a no-op for an empty list even though a single row would still batch once', async () => {
    let calls = 0
    const db = { insert: () => { calls += 1; return { values: () => ({ onConflictDoUpdate: () => {} }) } } }
    await upsertPostings(db, [])
    expect(calls).toBe(0)
  })
})
