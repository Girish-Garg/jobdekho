import { describe, it, expect } from 'vitest'
import { listCompanies, listCompanyCounts } from '../src/companies.js'
import { companyMatcher } from '../src/posting-filters.js'

const storeOf = (rows) => ({ corpus: { rows: () => rows }, statuses: new Map() })

describe('listCompanies', () => {
  it('lists each company once, as it was scraped, and skips rows with none', () => {
    const rows = [{ company: 'Razorpay' }, { company: 'Acme' }, { company: 'Razorpay' }, { company: '' }, {}]
    expect(listCompanies(storeOf(rows))).toEqual(['Razorpay', 'Acme'])
  })
})

let n = 0
const job = (company, over = {}) => ({
  id: `p${++n}`, company, title: 'Software Engineer', tags: [], descriptionSnippet: '', source: 'lever:x',
  level: 'mid', workMode: 'onsite', degreeMin: 'none', ...over,
})

describe('companyMatcher', () => {
  it('matches an employer under every spelling its sources use', () => {
    const matches = companyMatcher(['Phonepe'])
    expect(matches({ company: 'PHONEPE LIMITED' })).toBe(true)
    expect(matches({ company: 'PhonePe Private Limited' })).toBe(true)
    expect(matches({ company: 'Razorpay' })).toBe(false)
  })

  it('is no filter at all with nothing picked', () => {
    expect(companyMatcher([])).toBeNull()
    expect(companyMatcher(undefined)).toBeNull()
    expect(companyMatcher(['  ', '.'])).toBeNull()
  })
})

describe('listCompanyCounts', () => {
  it('counts each employer once across spellings, under its best-cased name, most jobs first', () => {
    const rows = [job('meesho'), job('meesho'), job('Meesho'), job('CRED'), job('cred'), job('cred'), job('Acme')]
    expect(listCompanyCounts(storeOf(rows), 'u1')).toEqual([
      { name: 'CRED', count: 3, picked: [] },
      { name: 'Meesho', count: 3, picked: [] },
      { name: 'Acme', count: 1, picked: [] },
    ])
  })

  // The count is what picking the company would show, so the other filters
  // apply; the name comes from the whole corpus, so it does not change.
  it('counts under every filter but the company one', () => {
    const rows = [job('Meesho', { level: 'internship' }), job('meesho'), job('Acme', { level: 'internship' })]
    const counts = listCompanyCounts(storeOf(rows), 'u1', { levels: ['internship'], companies: ['Acme'] })
    expect(counts).toEqual([
      { name: 'Acme', count: 1, picked: ['Acme'] },
      { name: 'Meesho', count: 1, picked: [] },
    ])
  })

  it('names the picks an entry stands for, and keeps a pick with no jobs left at nought', () => {
    const rows = [job('Phonepe'), job('PHONEPE LIMITED'), job('Acme', { level: 'senior' })]
    const counts = listCompanyCounts(storeOf(rows), 'u1', { levels: ['mid'], companies: ['PHONEPE LIMITED', 'Acme', 'Nowhere Inc'] })
    expect(counts).toEqual([
      { name: 'Phonepe', count: 2, picked: ['PHONEPE LIMITED'] },
      { name: 'Acme', count: 0, picked: ['Acme'] },
      { name: 'Nowhere Inc', count: 0, picked: ['Nowhere Inc'] },
    ])
  })
})
