import { describe, it, expect } from 'vitest'
import { familiesFor, expandQuery } from '@jobdekho/core/families.js'

const has = (terms, needle) => terms.some((t) => t.includes(needle))

describe('familiesFor', () => {
  it('places a query in its family', () => {
    expect(familiesFor('web dev')).toContain('web')
    expect(familiesFor('data scientist')).toContain('data')
    expect(familiesFor('devops')).toContain('devops')
  })

  it('returns nothing for a query that is not a job family', () => {
    expect(familiesFor('razorpay')).toEqual([])
    expect(familiesFor('')).toEqual([])
  })

  // Short terms are matched at a word boundary, or they fire on any substring.
  it('does not match a short term inside an unrelated word', () => {
    expect(familiesFor('email marketing')).toEqual([])
    expect(familiesFor('aquarium')).toEqual([])
  })
})

describe('expandQuery', () => {
  // The example the whole feature exists for.
  it('reaches sibling web roles and general software, but never data', () => {
    const terms = expandQuery('web dev')
    expect(has(terms, 'frontend')).toBe(true)
    expect(has(terms, 'backend')).toBe(true)
    expect(has(terms, 'full stack')).toBe(true)
    expect(has(terms, 'software')).toBe(true)
    expect(has(terms, 'data scien')).toBe(false)
    expect(has(terms, 'data analy')).toBe(false)
  })

  it('keeps data searches inside the data family', () => {
    const terms = expandQuery('data scientist')
    expect(has(terms, 'machine learning')).toBe(true)
    expect(has(terms, 'frontend')).toBe(false)
    expect(has(terms, 'wordpress')).toBe(false)
  })

  it('pulls both directions across an adjacency', () => {
    // software names web and mobile as near, so a software search reaches both.
    const terms = expandQuery('sde')
    expect(has(terms, 'react')).toBe(true)
    expect(has(terms, 'android')).toBe(true)
    expect(has(terms, 'data scien')).toBe(false)
  })

  // Falling back is what keeps a company or an unusual role searchable. "qa" is
  // in here on purpose: no family lists it, and a literal '%qa%' finds the QA
  // titles precisely, where adding it as a term would also match "Aqua".
  it('returns null when the query belongs to no family', () => {
    expect(expandQuery('razorpay')).toBeNull()
    expect(expandQuery('blacksmith')).toBeNull()
    expect(expandQuery('qa')).toBeNull()
  })
})

describe('expansion breadth', () => {
  // A bare "engineer" term matched Data Engineer and Network Support Engineer
  // alike and pulled half the corpus into every search.
  it('has no term generic enough to match any engineering title', () => {
    for (const q of ['web dev', 'sde', 'devops', 'quality assurance']) {
      expect(expandQuery(q)).not.toContain('engineer');
    }
  })

  // Only web, software and mobile borrow from each other. A devops or QA
  // search returning every software role was too loose to be useful.
  it('keeps the specialist families to themselves', () => {
    for (const q of ['devops', 'quality assurance', 'infosec', 'ui/ux']) {
      const terms = expandQuery(q)
      expect(has(terms, 'software')).toBe(false)
      expect(has(terms, 'wordpress')).toBe(false)
    }
  })

  it('still lets the dev cluster reach across', () => {
    expect(has(expandQuery('web dev'), 'software')).toBe(true)
    expect(has(expandQuery('android'), 'software')).toBe(true)
  })
})
