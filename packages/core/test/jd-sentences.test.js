import { describe, it, expect } from 'vitest'
import { jdSentences, MIN_SENTENCE_TOKENS } from '@jobdekho/core/jd-sentences.js'

describe('jdSentences', () => {
  it('splits on sentence punctuation and normalizes each piece', () => {
    expect(jdSentences('We build payment rails for India. You will own the ledger service! Interested?'))
      .toEqual(['we build payment rails for india', 'you will own the ledger service'])
  })

  // What a Greenhouse body looks like after the angle brackets are stripped:
  // the tag names stay behind as bare tokens.
  it('splits on closing-tag residue and drops the tag tokens', () => {
    const body = 'div class= content-intro p strong About PhonePe Limited: /strong /p p Headquartered in India, the app was launched in 2016. /p ul li Own the ledger service end to end /li li Ship weekly /li /ul'
    const out = jdSentences(body)
    expect(out).toContain('headquartered in india the app was launched in 2016')
    expect(out).toContain('own the ledger service end to end')
    for (const s of out) expect(s.split(' ')).not.toContain('p')
  })

  it('splits numbered lists and dash bullets', () => {
    expect(jdSentences('1. Collaborate with our AI engineering team daily. 2. Support the integration of AI into our systems.'))
      .toEqual(['collaborate with our ai engineering team daily', 'support the integration of ai into our systems'])
    expect(jdSentences('Perks - Free lunch every single day - Remote first team with async culture'))
      .toEqual(['free lunch every single day', 'remote first team with async culture'])
  })

  // A heading recurs in every ad without saying anything about the role, and
  // counting it as template would strip nothing of value while a bullet stub
  // of three words would be unlucky to match anyway.
  it('drops pieces under the token floor', () => {
    expect(MIN_SENTENCE_TOKENS).toBe(4)
    expect(jdSentences('Responsibilities: Build the API. Ship the API to production.'))
      .toEqual(['ship the api to production'])
  })

  it('makes the same sentence from two boards compare equal', () => {
    const [a] = jdSentences('We are an Equal-Opportunity Employer!')
    const [b] = jdSentences('p we are an equal opportunity employer /p')
    expect(a).toBe('we are an equal opportunity employer')
    expect(b).toBe(a)
  })

  it('returns nothing for an absent body', () => {
    expect(jdSentences(null)).toEqual([])
    expect(jdSentences('')).toEqual([])
  })
})
