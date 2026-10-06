import { describe, it, expect } from 'vitest'
import { FACT_VALUES } from '@jobdekho/core/fact-values.js'
import { statedHours, hoursKind } from '@jobdekho/core/shift-hours.js'

const read = (kind, line) => FACT_VALUES[kind](line)?.value ?? null

// What the facts model's lines state, as the list shows them. Lines from
// the owner's corpus, 2026-10-06, including the ones a first model read
// wrongly: the model says which fact a line is about, these say what it
// states, and say nothing for a line that states none.
describe('a pre-placement offer', () => {
  it('is a job to be had after the internship or on a condition', () => {
    expect(read('ppo', '- Paid Internship with potential for full-time employment.')).toBe('PPO possible')
    expect(read('ppo', 'Bangalore · In-office · 3\u20136 months · Full-time offer for the right ones')).toBe('PPO possible')
    expect(read('ppo', 'Based on performance, a full-time role may be extended.')).toBe('PPO possible')
    expect(read('ppo', 'Duration: 3-Month Internship with PPO')).toBe('PPO possible')
  })

  // A first model took each of these for an offer.
  it('is not the job type, the internship worked full time, another perk, or a no', () => {
    expect(read('ppo', 'Permanent')).toBeNull()
    expect(read('ppo', 'Permanent - Full time')).toBeNull()
    expect(read('ppo', 'Duration: 3 Months (Full-time)')).toBeNull()
    expect(read('ppo', '- 3-month full-time internship')).toBeNull()
    expect(read('ppo', 'Type: Internship, full-time, 6 to 12 months')).toBeNull()
    expect(read('ppo', '• Letter of Recommendation based on performance')).toBeNull()
    expect(read('ppo', 'Note: This is only for internship and does not guarantee a full-time job offer.')).toBeNull()
    expect(read('ppo', 'Medical plans (PPO and HMO) after your internship')).toBeNull()
  })
})

describe('an address to send the resume to', () => {
  it('is the address in a line about applying, marked when personal', () => {
    expect(FACT_VALUES.email('Apply here: hr@sunsysglobal.com')).toEqual({ value: 'hr@sunsysglobal.com', personal: false })
    expect(FACT_VALUES.email('Mail your CV to someone.hiring@gmail.com.')).toEqual({ value: 'someone.hiring@gmail.com', personal: true })
  })

  it('is not a help desk, a questions address or a line with none', () => {
    expect(read('email', 'If you need an accommodation, email recruiting@example.com.')).toBeNull()
    expect(read('email', 'Questions: jobs@example.co')).toBeNull()
    expect(read('email', 'For help, write to support@example.com')).toBeNull()
    expect(read('email', 'Send your resume through the careers page.')).toBeNull()
  })
})

describe('an early start', () => {
  it('is an immediate start, or a joining date within a month', () => {
    expect(read('start', '- Immediate joiners are preferred')).toBe('Immediate start')
    expect(read('start', 'Notice Period: Immediate to 30days')).toBe('Join within 30 days')
    expect(read('start', 'Should be able to join within 2 weeks')).toBe('Join within 2 weeks')
    expect(read('start', 'Notice period: 90 days')).toBeNull()
    expect(read('start', 'Joining within 60 days')).toBeNull()
  })
})

describe('the hours a line states', () => {
  it('reads each working day in it, AM or PM taken from its other end', () => {
    expect(statedHours('Shift Timings: 1-10 PM IST / 2-11 PM IST').map((h) => h.text)).toEqual(['1 PM to 10 PM', '2 PM to 11 PM'])
    expect(statedHours('11 - 8 pm')[0].text).toBe('11 AM to 8 PM')
    expect(statedHours('10 - 6 am')[0].text).toBe('10 PM to 6 AM')
    expect(statedHours('- Willingness to work in 1st Shift (7:30 am IST to 3:30 pm IST).')[0].text).toBe('7:30 AM to 3:30 PM')
  })

  it('reads a call, an event or a typing slip as no working day', () => {
    expect(statedHours('⏰ Time: 4:30 PM \u2013 5:30 PM')).toEqual([])
    expect(statedHours('General Shift \u2013 12 AM to 9 PM')).toEqual([])
  })

  it('names hours by when they fall, and daytime by nothing', () => {
    const kind = (line) => hoursKind(statedHours(line)[0])
    expect(kind('9:30 PM to 5:30 AM')).toBe('Night shift')
    expect(kind('2 PM to 11 PM')).toBe('Late shift')
    expect(kind('5.30AM to 2.30PM')).toBe('Early shift')
    expect(kind('10:00 AM \u2013 6:30 PM')).toBeNull()
    expect(kind('11 AM to 8 PM')).toBeNull()
  })
})

describe('the shifts', () => {
  it('show the hours, nights now and then, nights among rotating shifts, and other regions', () => {
    expect(read('shift', 'Shift timings: 2 PM to 11 PM IST')).toBe('Late shift, 2 PM to 11 PM')
    expect(read('shift', '12 PM to 9 PM and / or 2 PM to 11 PM - IST time zone')).toBe('Late shifts, 12 PM to 9 PM or 2 PM to 11 PM')
    expect(read('shift', 'Working hours are 8:00am to 5:00pm or 1.30pm to 10.30pm.')).toBe('Shifts, 8 AM to 5 PM or 1:30 PM to 10:30 PM')
    expect(read('shift', '- 3:00 PM \u2013 12:00 AM CST, Saturday\u2013Wednesday')).toBe('US hours, 3 PM to 12 AM CST')
    expect(read('shift', 'This role may occasionally require working night shifts.')).toBe('Night shifts possible')
    expect(read('shift', 'Willing to work in different shifts (Morning, Afternoon and Night IST).')).toBe('Rotational shifts, including nights')
    expect(read('shift', '- Willing to work in European shifts')).toBe('UK or Europe hours')
    expect(read('shift', 'Different Shifts including APAC/EMEA/AMER hours as required.')).toBe('Shifts across time zones')
    expect(read('shift', 'Must be willing to work in shift based on business needs')).toBe('Shift work')
  })

  it('show nothing for daytime hours, a day shift, a bare heading or a no', () => {
    expect(read('shift', '- Working Hours: 10:00 AM \u2013 6:30 PM')).toBeNull()
    expect(read('shift', 'Shift Timing: General Shift')).toBeNull()
    expect(read('shift', 'Shift timing')).toBeNull()
    expect(read('shift', 'The SDC operates during daytime hours with shifts from the morning')).toBeNull()
    expect(read('shift', 'We do not have night shifts.')).toBeNull()
    expect(read('shift', 'Drive shift-left testing practices.')).toBeNull()
  })
})
