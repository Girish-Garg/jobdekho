import { describe, it, expect } from 'vitest'
import { normalizeEntry, normalizeEntryList, normalizeGroup, normalizeGroupList } from '@jobdekho/store/profile-entry.js'

describe('normalizeEntry', () => {
  it('fills every field a resume line needs, defaulting what is missing', () => {
    expect(normalizeEntry(null, 0)).toMatchObject({
      order: 0, title: '', organisation: '', location: '', startDate: '', endDate: '',
      bullets: [], tech: [], link: '', pinned: false, weight: 0,
    })
    expect(normalizeEntry(null, 0).id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('keeps a given id stable instead of minting a new one', () => {
    expect(normalizeEntry({ id: 'keep-me' }, 3)).toMatchObject({ id: 'keep-me', order: 3 })
  })

  it('trims text but never folds its case, unlike the flat ranking fields', () => {
    const entry = normalizeEntry({ title: '  Senior Engineer  ', organisation: 'Acme Corp' }, 0)
    expect(entry.title).toBe('Senior Engineer')
    expect(entry.organisation).toBe('Acme Corp')
  })

  it('orders and dedupes bullets and tech without lowercasing them', () => {
    const entry = normalizeEntry({ bullets: ['Shipped X', 'Shipped X', ' Shipped Y '], tech: ['React', 'react'] }, 0)
    expect(entry.bullets).toEqual(['Shipped X', 'Shipped Y'])
    expect(entry.tech).toEqual(['React', 'react'])
  })

  it('keeps a pinned flag and a numeric weight for a future resume builder', () => {
    expect(normalizeEntry({ pinned: true, weight: '5' }, 0)).toMatchObject({ pinned: true, weight: 5 })
    expect(normalizeEntry({ weight: 'not a number' }, 0).weight).toBe(0)
  })
})

describe('normalizeEntryList', () => {
  it('numbers entries by array position and is empty for anything not an array', () => {
    const list = normalizeEntryList([{ title: 'A' }, { title: 'B' }])
    expect(list.map((e) => e.order)).toEqual([0, 1])
    expect(normalizeEntryList(null)).toEqual([])
    expect(normalizeEntryList(undefined)).toEqual([])
  })

  it('renumbers order to match a reordered array', () => {
    const first = normalizeEntryList([{ title: 'A' }, { title: 'B' }])
    const reordered = normalizeEntryList([first[1], first[0]])
    expect(reordered.map((e) => e.title)).toEqual(['B', 'A'])
    expect(reordered.map((e) => e.order)).toEqual([0, 1])
    // Reordering keeps each entry's own id: it is the same entry, just moved.
    expect(reordered.map((e) => e.id).sort()).toEqual(first.map((e) => e.id).sort())
  })
})

describe('normalizeGroup / normalizeGroupList', () => {
  it('normalizes a skill group and dedupes its items', () => {
    const group = normalizeGroup({ name: 'Languages', items: ['Python', 'Python', ' Go '] }, 0)
    expect(group).toMatchObject({ order: 0, name: 'Languages', items: ['Python', 'Go'] })
  })

  it('defaults a missing list to no groups at all', () => {
    expect(normalizeGroupList(undefined)).toEqual([])
  })
})
