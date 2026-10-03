import { describe, it, expect } from 'vitest'
import { cautionOf, fewDetails, sharedAdFlag, FEW_WORDS } from '@jobdekho/core/caution.js'

const board = (description, over = {}) => cautionOf({ description, source: 'linkedin', ...over })
const codes = (description, over) => board(description, over).map((flag) => flag.code)

describe('the fee flag', () => {
  it('states the fee an applicant is asked to pay, with its amount', () => {
    expect(board('Selected candidates must pay a registration fee of Rs. 1,500 before joining.'))
      .toEqual([{ code: 'fee', reason: 'Asks applicants to pay a ₹1,500 registration fee', evidence: 'Selected candidates must pay a registration fee of Rs. 1,500 before joining.' }])
    expect(codes('A refundable security deposit of ₹2000 is required for the laptop.')).toEqual(['fee'])
    expect(codes('Interns need to pay a one-time fee for the certificate.')).toEqual(['fee'])
    expect(codes('Training charges are mandatory for all trainees.')).toEqual(['fee'])
  })

  // Negated clauses say the opposite of their words.
  it('never reads a negated fee', () => {
    expect(codes('There is no registration fee to apply.')).toEqual([])
    expect(codes('We do not charge any training fee at any stage.')).toEqual([])
    expect(codes('Registration fee: Nil.')).toEqual([])
    expect(codes('The placement fee is borne by the company.')).toEqual([])
  })

  // An employer's own warning uses exactly the words a red flag is made of.
  it('strips anti-fraud notices first', () => {
    const notice = 'Fraud alert\n\nScammers may ask you to pay a registration fee of Rs 5000 to confirm an offer.\n\nBuild APIs in Go.'
    expect(codes(notice)).toEqual([])
    expect(codes('Beware of fake recruiters who ask for a security deposit of Rs 2000.')).toEqual([])
  })

  it('leaves fees that are the work itself', () => {
    expect(codes('Explain the course fees to parents and collect fees on time.')).toEqual([])
    expect(codes('Reconcile security deposits of Rs 5,000 for tenants.')).toEqual([])
    expect(codes('Revenue includes subscription fees and usage billing.')).toEqual([])
  })
})

describe('the personal email flag', () => {
  it('states a free mail address given as the contact', () => {
    expect(board('Apply: email me at someone.d10@gmail.com with your CV.'))
      .toEqual([{ code: 'personal-email', reason: 'Gives a personal email address (someone.d10@gmail.com) as the contact', evidence: 'Apply: email me at someone.d10@gmail.com with your CV.' }])
    expect(codes('Send resumes to hr.team@yahoo.co.in')).toEqual(['personal-email'])
  })

  it('leaves a company address alone', () => {
    expect(codes('Send resumes to careers@acme.com or jobs@zoho.com')).toEqual([])
  })
})

describe('the performance-pay flag', () => {
  it('states pay that is only performance-based, at most an "up to"', () => {
    expect(board('Stipend: Performance-Based, up to ₹7,500/-'))
      .toMatchObject([{ code: 'performance-pay', reason: 'Pay is only performance-based, up to ₹7,500' }])
    expect(codes('Stipend: Based on performance (with opportunity for full-time placement)')).toEqual(['performance-pay'])
    expect(board('', { stipend: 'Performance based' })).toMatchObject([{ code: 'performance-pay', evidence: 'Stipend: Performance based' }])
  })

  it('leaves real pay with a performance part', () => {
    expect(codes('Salary: ₹25,000 per month + performance-based incentives.')).toEqual([])
    expect(codes('We offer competitive salaries, performance-based incentives and benefits.')).toEqual([])
    expect(codes('Stipend: ₹10,000. A PPO based on performance.')).toEqual([])
  })
})

describe('cautionOf', () => {
  // A fraudster cannot post on a company's own careers site.
  it('never flags a company careers site', () => {
    const fee = 'Selected candidates must pay a registration fee of Rs. 1,500.'
    expect(cautionOf({ description: fee, source: 'greenhouse:acme' })).toEqual([])
    expect(cautionOf({ description: fee, source: 'amazon' })).toEqual([])
    expect(cautionOf({ description: fee, source: 'internshala' })).toHaveLength(1)
  })

  // Missing pay and a short text were most of the old chip; neither counts.
  it('says nothing for a plain posting with no pay stated', () => {
    expect(cautionOf({ description: 'Build APIs.', source: 'linkedin', stipend: null })).toEqual([])
  })
})

describe('sharedAdFlag', () => {
  it('states how many names one ad was posted under', () => {
    expect(sharedAdFlag(['Vortenza Systems', 'Devryxa', 'Zenithbyte'])).toEqual({
      code: 'shared-ad', reason: 'The same ad appears under 3 company names', evidence: 'Vortenza Systems, Devryxa, Zenithbyte',
    })
  })
})

describe('fewDetails', () => {
  const words = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ')

  it('marks a very thin full text', () => {
    expect(fewDetails({ description: 'External Job Description', source: 'successfactors:asianpaints' })).toBe(true)
    expect(fewDetails({ description: words(FEW_WORDS - 1), source: 'linkedin' })).toBe(true)
    expect(fewDetails({ description: words(FEW_WORDS), source: 'linkedin' })).toBe(false)
  })

  // An empty text is a fetch not yet made; a card board's text is its card.
  it('never judges an empty text or a card board', () => {
    expect(fewDetails({ description: '', source: 'linkedin' })).toBe(false)
    expect(fewDetails({ description: 'React Native app for a startup', source: 'internshala' })).toBe(false)
    expect(fewDetails({ description: '- Ship\n- Learn', source: 'unstop' })).toBe(false)
  })
})
