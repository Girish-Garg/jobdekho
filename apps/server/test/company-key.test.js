import { describe, it, expect } from 'vitest'
import { companyKey, companiesNamed } from '@jobdekho/server/chat/company-key.js'

describe('companyKey', () => {
  it('meets the same employer however it was scraped', () => {
    expect(companyKey('PHONEPE LIMITED')).toBe('phonepe')
    expect(companyKey('PhonePe Private Limited')).toBe('phonepe')
    expect(companyKey('Razorpay Software Private Limited')).toBe('razorpay')
    expect(companyKey('Amazon Web Services, Inc.')).toBe('amazon web')
  })

  // A company whose whole name is a legal word keeps it rather than vanishing.
  it('keeps the last word when that is all there is', () => {
    expect(companyKey('Technology')).toBe('technology')
  })
})

describe('companiesNamed', () => {
  const COMPANIES = ['Razorpay Software Private Limited', 'PHONEPE LIMITED', 'Phonepe', 'Career', 'EY', 'Amazon', 'Amazon Web Services']

  it('finds a company named as whole words, possessive included, once per employer', () => {
    expect(companiesNamed("Is Razorpay's team hiring? And PhonePe?", COMPANIES)).toEqual([
      { key: 'razorpay', name: 'Razorpay Software Private Limited' },
      { key: 'phonepe', name: 'PHONEPE LIMITED' },
    ])
  })

  it('does not find one inside another word', () => {
    expect(companiesNamed('any razorpayments roles?', COMPANIES)).toEqual([])
  })

  // "Career" and "EY" are real company names in a real corpus.
  it('ignores names that are ordinary words in a job question, or too short to trust', () => {
    expect(companiesNamed('Which career path fits me? Hey, any remote ones?', COMPANIES)).toEqual([])
  })

  it('puts the longer name first when both match', () => {
    expect(companiesNamed('Is Amazon Web Services hiring?', COMPANIES).map((c) => c.key)).toEqual(['amazon web', 'amazon'])
  })

  it('names three at most', () => {
    const many = ['Alpha', 'Bravo', 'Charlie', 'Delta']
    expect(companiesNamed('alpha bravo charlie delta', many)).toHaveLength(3)
  })
})

// Greenhouse boards with no display name come through as their slug.
describe('companyKey on run-together names', () => {
  it('peels the long legal words off, and leaves short endings alone', () => {
    expect(companyKey('Razorpaysoftwareprivatelimited')).toBe('razorpay')
    expect(companyKey('Phonepeprivatelimited')).toBe('phonepe')
    expect(companyKey('Cisco')).toBe('cisco')
    expect(companyKey('Unlimited')).toBe('unlimited')
  })

  it('lets a question find a company scraped as its slug', () => {
    expect(companiesNamed('Is Razorpay hiring?', ['Razorpaysoftwareprivatelimited'])).toEqual([{ key: 'razorpay', name: 'Razorpaysoftwareprivatelimited' }])
  })
})
