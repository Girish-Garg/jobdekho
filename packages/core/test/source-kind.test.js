import { describe, it, expect } from 'vitest'
import { isCareerSite, cardOnly, sourceKind } from '@jobdekho/core/source-kind.js'

describe('isCareerSite', () => {
  it('reads every ATS board and company site as a careers site', () => {
    for (const source of ['greenhouse:stripe', 'workday:pwc', 'smartrecruiters:BoschGroup', 'amazon', 'infosys', 'some-new-ats:acme']) {
      expect(isCareerSite(source)).toBe(true)
    }
  })

  it('reads the boards that carry many companies as boards', () => {
    for (const source of ['linkedin', 'internshala', 'unstop', 'instahyre', 'remotive', 'remoteok', 'arbeitnow', 'hn-hiring', 'adzuna:in']) {
      expect(isCareerSite(source)).toBe(false)
    }
  })
})

describe('cardOnly', () => {
  it('names the boards whose text is only a card', () => {
    expect(cardOnly('internshala')).toBe(true)
    expect(cardOnly('adzuna:in')).toBe(true)
    expect(cardOnly('linkedin')).toBe(false)
    expect(cardOnly('greenhouse:stripe')).toBe(false)
  })

  it('reads the kind before the colon', () => {
    expect(sourceKind('adzuna:in')).toBe('adzuna')
    expect(sourceKind(undefined)).toBe('')
  })
})
