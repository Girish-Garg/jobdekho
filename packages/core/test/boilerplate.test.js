import { describe, it, expect } from 'vitest'
import { boilerplateIndex, BOILERPLATE_MIN_POSTINGS } from '@jobdekho/core/boilerplate.js'

const ABOUT = 'Acme is the leading payments platform in India with over four hundred million users. '
const EEO = 'We are an equal opportunity employer and welcome applicants of every background. '
const ROLE_A = 'You will own the ledger service and its reconciliation jobs end to end. '
const ROLE_B = 'You will build the merchant onboarding flow in React and Node. '
const ROLE_C = 'You will run the on-call rotation for the settlement pipeline. '

const posting = (company, descriptionText) => ({ company, descriptionText })

describe('boilerplateIndex', () => {
  it('calls a sentence template at three postings and not at two', () => {
    expect(BOILERPLATE_MIN_POSTINGS).toBe(3)
    const two = boilerplateIndex([posting('Acme', ABOUT + ROLE_A), posting('Acme', ABOUT + ROLE_B)])
    expect(two.isBoilerplate('acme is the leading payments platform in india with over four hundred million users')).toBe(false)
    const three = boilerplateIndex([
      posting('Acme', ABOUT + ROLE_A), posting('Acme', ABOUT + ROLE_B), posting('Acme', ABOUT + ROLE_C),
    ])
    expect(three.isBoilerplate('acme is the leading payments platform in india with over four hundred million users')).toBe(true)
    expect(three.isBoilerplate('you will own the ledger service and its reconciliation jobs end to end')).toBe(false)
  })

  it('counts a sentence once per posting, so one ad repeating itself is not template', () => {
    const index = boilerplateIndex([posting('Acme', ABOUT + ABOUT + ABOUT + ROLE_A), posting('Beta', ROLE_B)])
    expect(index.isBoilerplate('acme is the leading payments platform in india with over four hundred million users')).toBe(false)
  })

  // The EEO line is the same across employers, and the single count catches
  // it without knowing which company wrote it.
  it('strips a line shared across companies and keeps the role text in order', () => {
    const index = boilerplateIndex([
      posting('Acme', ABOUT + ROLE_A + EEO), posting('Beta', ROLE_B + EEO), posting('Gamma', ROLE_C + EEO),
    ])
    expect(index.strip(ROLE_A + EEO + ROLE_B))
      .toBe('you will own the ledger service and its reconciliation jobs end to end you will build the merchant onboarding flow in react and node')
  })

  // An aggregator that copies the employer's ad but spells the company its
  // own way must lose the same template the employer's copy loses, or the
  // two halves of one job stop matching. Counting per company broke this.
  it('does not care how the company is spelled', () => {
    const index = boilerplateIndex([
      posting('Acme', ABOUT + ROLE_A), posting('ACME Ltd', ABOUT + ROLE_A), posting('Acme', ABOUT + ROLE_B),
    ])
    expect(index.strip(ABOUT + ROLE_A)).toBe('you will own the ledger service and its reconciliation jobs end to end')
  })

  // The documented limit: a job posted three times looks exactly like a
  // template of three postings. Nothing is left to fingerprint, which is the
  // safe failure. This test pins the behaviour so a change to it is deliberate.
  it('erases a body the company posted three times over', () => {
    const repost = ABOUT + ROLE_A
    const index = boilerplateIndex([posting('Acme', repost), posting('Acme', repost), posting('Acme', repost)])
    expect(index.strip(repost)).toBe('')
  })

  it('returns an empty string for a missing body', () => {
    const index = boilerplateIndex([posting('Acme', null)])
    expect(index.strip(null)).toBe('')
    expect(index.strip(undefined)).toBe('')
  })
})
