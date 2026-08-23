import { describe, it, expect } from 'vitest'
import { toRow, refreshSet, upsertPostings } from '@jobdekho/db/queries.js'

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
})
