import { describe, it, expect } from 'vitest'
import { skillRegex, titleTokens } from '@jobdekho/core/fit-dimensions.js'

describe('skillRegex', () => {
  // Substring matching let the skill "c" match every word with the letter,
  // and "java" claim JavaScript roles.
  it('matches at word edges only', () => {
    expect(skillRegex('java').test('javascript developer')).toBe(false)
    expect(skillRegex('java').test('java developer')).toBe(true)
    expect(skillRegex('c').test('product manager')).toBe(false)
  })

  // Symbol edges cannot carry a word boundary.
  it('matches skills that carry symbols', () => {
    expect(skillRegex('c++').test('c++ developer')).toBe(true)
    expect(skillRegex('.net').test('asp.net engineer')).toBe(true)
  })
})

describe('titleTokens', () => {
  // Level has its own gate, so leaving a seniority word in would let one
  // signal count twice.
  it('ignores seniority words and rank numerals', () => {
    expect(titleTokens('Senior Staff Frontend Engineer II')).toEqual(['frontend', 'engineer'])
  })

  it('is empty for nothing but seniority', () => {
    expect(titleTokens('Senior II')).toEqual([])
  })
})
