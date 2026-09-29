import { describe, it, expect } from 'vitest'
import { listCompanies } from '../src/companies.js'

const storeOf = (rows) => ({ corpus: { rows: () => rows } })

describe('listCompanies', () => {
  it('lists each company once, as it was scraped, and skips rows with none', () => {
    const rows = [{ company: 'Razorpay' }, { company: 'Acme' }, { company: 'Razorpay' }, { company: '' }, {}]
    expect(listCompanies(storeOf(rows))).toEqual(['Razorpay', 'Acme'])
  })
})
