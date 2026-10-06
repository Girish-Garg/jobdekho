import { describe, it, expect } from 'vitest'
import { descriptionFacts } from '@jobdekho/core/description-facts.js'
import { postingFacts } from '@jobdekho/core/posting-facts.js'

// The plain readers alone: what the facts model adds once its audit passes
// is model-facts.test.js's.
const fact = (text, key) => descriptionFacts(text, { model: null })[key]
const value = (text, key) => fact(text, key)?.value ?? null

// Lines from the owner's corpus, 2026-10-06, the right ones and the ones a
// first draft read wrongly: a fact shown wrongly costs more than one missed.
describe('a pre-placement offer', () => {
  it('is read from the words that state one, with them as evidence', () => {
    expect(fact('Duration: 6 Months + PPO (based on performance)', 'ppo')).toEqual({ value: 'PPO possible', evidence: 'Says "Duration: 6 Months + PPO (based on performance)"' })
    expect(value('Conversion: Pre-placement offer based on performance', 'ppo')).toBe('PPO possible')
    expect(value('Interns may convert into a full-time role after six months.', 'ppo')).toBe('PPO possible')
    expect(value('About the internship\n\nBuild apps.\n\nPerks\n\nCertificate, Job offer', 'ppo')).toBe('PPO possible')
  })

  it('is not a health plan, a no, or a full-time role on a schedule', () => {
    expect(value('Medical, dental and vision plans (PPO and HMO), 401(k) match.', 'ppo')).toBeNull()
    expect(value('There is no PPO for this role.', 'ppo')).toBeNull()
    expect(value('This is a full-time role on a standard schedule, with an on-call rotation.', 'ppo')).toBeNull()
    expect(value('Whether you are seeking a full-time position after your internship or not.', 'ppo')).toBeNull()
    expect(value('Perks\n\nCertificate, Letter of recommendation', 'ppo')).toBeNull()
  })
})

describe('an address to send the resume to', () => {
  it('is read from a line about applying, and marked when it is personal', () => {
    expect(fact('📩 Apply by sending your resume to: hr@example.in', 'email')).toMatchObject({ value: 'hr@example.in', personal: false })
    expect(fact('- Interested candidates can share their updated CV at example.hiring@gmail.com', 'email')).toMatchObject({ value: 'example.hiring@gmail.com', personal: true })
    expect(value('If this is you, email us at recruiting@example.com', 'email')).toBe('recruiting@example.com')
  })

  it('is not a help desk, a fraud warning or a questions address', () => {
    expect(value("Please email accessibility@example.com and we'll discuss your situation (this email does not accept applications).", 'email')).toBeNull()
    expect(value("If something seems off or you're contacted by an unexpected third party, reach out to careers@example.com", 'email')).toBeNull()
    expect(value('If you have any questions about the steps above, write to internship-queries@example.com', 'email')).toBeNull()
    expect(value('Questions: jobs@example.co', 'email')).toBeNull()
  })
})

describe('the terms', () => {
  it('reads the openings, from a heading or a line', () => {
    expect(value('Number of openings\n\n10\n\nAbout Acme', 'openings')).toBe('10 openings')
    expect(value('Number of Openings: 2', 'openings')).toBe('2 openings')
    expect(value('We have 1 opening.', 'openings')).toBeNull()
  })

  it('reads a bond, a service agreement, or that there is none', () => {
    expect(value('A 2 year bond applies.', 'bond')).toBe('2-year bond')
    expect(value('Candidates sign a bond of 18 months.', 'bond')).toBe('18-month bond')
    expect(value('You will sign a service agreement on joining.', 'bond')).toBe('Service agreement')
    expect(value('No bond, no deposits.', 'bond')).toBe('No bond')
  })

  // The value is the shift reader's (shift-value.js): the hours a line
  // gives, nights now and then, nights among rotating shifts.
  it('reads an immediate start and the shifts, but not shifts a product is about or none at all', () => {
    expect(value('- Immediate joiners preferred.', 'start')).toBe('Immediate start')
    expect(value('- Open to work in the Night Shift(6PM to 1 AM)', 'shift')).toBe('Night shift, 6 PM to 1 AM')
    expect(value('- Day shift and flexible to work in Night shift if needed.', 'shift')).toBe('Night shifts possible')
    expect(value('- Ready to work in 24X7 shifts (Rotational Shifts including Night Shift and Weekends)', 'shift')).toBe('Rotational shifts, including nights')
    expect(value('Willing to work in 24/7 rotational shifts.', 'shift')).toBe('Rotational shifts')
    expect(value('The candidate will work US shift timings.', 'shift')).toBe('US hours')
    expect(value('We do not have night shifts.', 'shift')).toBeNull()
    expect(value('Our platform covers labor laws on overtime and night shifts in 60 countries.', 'shift')).toBeNull()
  })
})

it('reaches a posting\'s facts beside the years, pay and work mode', () => {
  const facts = postingFacts({ title: 'Intern', company: 'Acme', descriptionText: 'Duration: 6 Months + PPO (based on performance)' })
  expect(facts).toMatchObject({ years: null, ppo: { value: 'PPO possible' }, email: null })
})
