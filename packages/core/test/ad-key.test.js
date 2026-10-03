import { describe, it, expect } from 'vitest'
import { adKey, AD_KEY_MIN_WORDS } from '@jobdekho/core/ad-key.js'

// The study's stipend mill: one ad, each copy naming its own company.
const mill = (name) => `${name} is offering a structured career launch program for college students. ${'Work on real projects with mentors and weekly reviews. '.repeat(5)}Apply to ${name} today.`

describe('adKey', () => {
  it('keys one ad alike under different company names', () => {
    const keys = ['Vortenza Systems', 'Devryxa', 'UM IT PRIVATE LIMITED'].map((name) => adKey(mill(name), name))
    expect(new Set(keys).size).toBe(1)
    expect(keys[0]).toMatch(/^[0-9a-f]{16}$/)
  })

  it('keys different ads apart', () => {
    const other = `Devryxa builds billing software for clinics. ${'Ship features in React and review code daily. '.repeat(6)}`
    expect(adKey(other, 'Devryxa')).not.toBe(adKey(mill('Devryxa'), 'Devryxa'))
  })

  // "External Job Description" is shared by chance, not by a mill.
  it('has no key for a short text', () => {
    const short = Array.from({ length: AD_KEY_MIN_WORDS - 1 }, (_, i) => `w${i}`).join(' ')
    expect(adKey(short, 'Acme')).toBeNull()
    expect(adKey('', 'Acme')).toBeNull()
  })
})
