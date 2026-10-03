import { describe, it, expect } from 'vitest'
import { modeInText } from '@jobdekho/core/work-mode-text.js'

const mode = (text) => modeInText(text)?.mode ?? null

describe('modeInText', () => {
  it('reads a labelled workplace field', () => {
    expect(mode('Workplace type: Hybrid Working')).toBe('hybrid')
    expect(mode('Work Mode: Work From Office')).toBe('onsite')
    expect(mode('Location type - Remote')).toBe('remote')
    expect(mode('Location: Remote')).toBe('remote')
    expect(mode('Location: Bengaluru')).toBeNull()
  })

  it('reads statements about the job', () => {
    expect(mode('This role is hybrid, three days a week.')).toBe('hybrid')
    expect(mode('This position is remote.')).toBe('remote')
    expect(mode('You will thrive in our remote-first, asynchronous organization.')).toBe('remote')
    expect(mode('Required to work from office premises.')).toBe('onsite')
    expect(mode('In this hybrid role, you will have a defined work location.')).toBe('hybrid')
  })

  // Five days in the office is an office job, fewer a hybrid one.
  it('reads days in the office by their number', () => {
    expect(mode('We are in office 5 days a week for all roles.')).toBe('onsite')
    expect(mode('3 Days a week in office')).toBe('hybrid')
    expect(mode('Work from office 3 days a week.')).toBe('hybrid')
    expect(mode('2 days WFO')).toBe('hybrid')
  })

  it('handles negations', () => {
    expect(mode('Required to work from office premises [No WFH]')).toBe('onsite')
    expect(mode('This is not a remote role.')).toBeNull()
    expect(mode('Remote work is not possible for this team. No work from home.')).toBeNull()
    expect(mode('This is a non-remote position.')).toBeNull()
  })

  // A home-office allowance or flexible days say nothing about the job.
  it('does not read perks or a word on its own', () => {
    expect(mode('A work from home allowance of Rs 2000.')).toBeNull()
    expect(mode('Collaborate with remote teams across time zones.')).toBeNull()
    expect(mode('Experience with remote monitoring tools.')).toBeNull()
  })

  // "Our company is remote-first" yields to what the posting says of itself.
  it('lets a statement about this job outrank one about the company', () => {
    expect(mode('We are a remote-first company. Workplace type: Hybrid')).toBe('hybrid')
  })

  it('reads hybrid over remote, and a real contradiction as nothing', () => {
    expect(mode('Flexibility: Remote/Hybrid Work Model. You can work remotely on Fridays.')).toBe('hybrid')
    expect(mode('This is a fully remote role. You must work from office daily.')).toBeNull()
  })

  it('names the words it read', () => {
    expect(modeInText('Workplace type: On-site')).toEqual({ mode: 'onsite', words: 'Workplace type: On-site', scope: 'own' })
  })
})
