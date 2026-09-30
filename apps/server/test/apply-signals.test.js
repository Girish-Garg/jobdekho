import { describe, it, expect } from 'vitest'
import { pageSignals } from '@jobdekho/server/apply/page-signals.js'
import { classify } from '@jobdekho/server/apply/field-classify.js'
import { applyUrlFor, offersApply } from '@jobdekho/server/apply/apply-url.js'
import { questionsUrl, readQuestions, withQuestions } from '@jobdekho/server/apply/greenhouse-questions.js'
import { sentenceFor } from '@jobdekho/server/apply/handover-copy.js'

const field = (over) => ({ tag: 'input', type: 'text', role: '', name: '', id: '', ac: '', aria: '', label: '', question: '', placeholder: '', auto: '', qa: '', visible: true, ...over })
const page = (over = {}) => ({ url: 'https://jobs.example.com/apply', title: 'Apply', text: '', frames: [], fields: [], buttons: [], ...over })
const signals = (p) => pageSignals(p, p.fields.map((f) => classify(f)))

describe('pageSignals', () => {
  it('sees a sign-in wall, a new-account wall and a code', () => {
    expect(signals(page({ fields: [field({ type: 'email', label: 'Email' }), field({ type: 'password', label: 'Password' })] })).wall).toBe('sign-in')
    expect(signals(page({ text: 'Create an account', fields: [field({ type: 'password', label: 'Password' })] })).wall).toBe('account')
    expect(signals(page({ fields: [field({ type: 'password', label: 'Password' }), field({ type: 'password', label: 'Confirm password' })] })).wall).toBe('account')
    expect(signals(page({ fields: [field({ ac: 'one-time-code', label: 'Code' })] })).wall).toBe('code')
  })

  it('sees an email-first sign-in modal with nothing else to fill', () => {
    const p = page({ text: 'Sign in to apply', fields: [field({ type: 'email', label: 'Email' })], buttons: [{ text: 'Continue with Google' }, { text: 'Create an account' }] })
    expect(signals(p).wall).toBe('sign-in')
  })

  it('counts a showing challenge as a wall, and an invisible captcha script as nothing', () => {
    const shown = page({ frames: [{ src: 'https://www.google.com/recaptcha/api2/bframe?k=x', w: 400, h: 580 }] })
    expect(signals(shown).wall).toBe('human-check')
    expect(signals(page({ frames: [{ src: 'https://geo.captcha-delivery.com/captcha/?x', w: 0, h: 0 }] })).wall).toBe('human-check')
    expect(signals(page({ frames: [{ src: 'https://www.recaptcha.net/recaptcha/api2/anchor?size=invisible', w: 256, h: 60 }] })).wall).toBeNull()
  })

  it('sees a closed posting, a confirmation, and the submit button of the last step', () => {
    expect(signals(page({ text: 'Page not found The page you requested was not found' })).closed).toBe(true)
    expect(signals(page({ text: 'Thank you for applying! We have received your application.' })).submitted).toBe(true)
    const last = page({ fields: [field({ label: 'Email' })], buttons: [{ text: 'Submit application', rect: { x: 1, y: 2, w: 3, h: 4 } }, { text: 'Sign in' }] })
    expect(signals(last).submit).toEqual({ x: 1, y: 2, w: 3, h: 4 })
    expect(signals(page({ buttons: [{ text: 'Next', rect: {} }] })).submit).toBeNull()
  })
})

describe('applyUrlFor', () => {
  const posting = (source, url, externalId = '42') => ({ source, url, externalId })

  it('opens the page the form is on', () => {
    expect(applyUrlFor(posting('lever:cred', 'https://jobs.lever.co/cred/abc'))).toBe('https://jobs.lever.co/cred/abc/apply')
    expect(applyUrlFor(posting('lever:cred', 'https://jobs.lever.co/cred/abc/apply'))).toBe('https://jobs.lever.co/cred/abc/apply')
    expect(applyUrlFor(posting('ashby:vanta', 'https://jobs.ashbyhq.com/vanta/dbd4'))).toBe('https://jobs.ashbyhq.com/vanta/dbd4/application')
    expect(applyUrlFor(posting('greenhouse:groww', 'https://job-boards.eu.greenhouse.io/groww/jobs/49'))).toBe('https://job-boards.eu.greenhouse.io/groww/jobs/49')
    expect(applyUrlFor(posting('greenhouse:groww', 'https://groww.in/careers?gh_jid=49', '49'))).toBe('https://job-boards.greenhouse.io/groww/jobs/49')
    expect(applyUrlFor(posting('workday:nvidia', 'https://nvidia.wd5.myworkdayjobs.com/x/job/1'))).toBe('https://nvidia.wd5.myworkdayjobs.com/x/job/1')
  })

  it('offers nothing for job boards or for a link that is not a web page', () => {
    for (const source of ['linkedin', 'internshala', 'unstop', 'instahyre', 'adzuna', 'remotive']) {
      expect(offersApply(posting(source, 'https://example.com/job'))).toBe(false)
      expect(applyUrlFor(posting(source, 'https://example.com/job'))).toBeNull()
    }
    expect(applyUrlFor(posting('lever:x', 'javascript:alert(1)'))).toBeNull()
  })
})

describe('Greenhouse questions', () => {
  const API = {
    questions: [
      { label: 'First Name', required: true, fields: [{ name: 'first_name', type: 'input_text', values: [] }] },
      { label: 'Notice period?', required: false, fields: [{ name: 'question_9', type: 'multi_value_single_select', values: [{ label: 'Immediate' }, { label: '30 days' }] }] },
    ],
    compliance: [{ questions: [{ label: 'Gender', required: false, fields: [{ name: 'gender', type: 'multi_value_single_select', values: [] }] }] }],
  }

  it('asks the public board API with nothing but the board and job id', () => {
    expect(questionsUrl({ source: 'greenhouse:groww', externalId: '49' })).toBe('https://boards-api.greenhouse.io/v1/boards/groww/jobs/49?questions=true')
    expect(questionsUrl({ source: 'lever:x', externalId: '1' })).toBeNull()
  })

  it('names fields the page left unnamed and marks required ones', () => {
    const questions = readQuestions(API)
    expect(questions.get('question_9')).toEqual({ label: 'Notice period?', required: false, options: ['Immediate', '30 days'] })
    expect(questions.get('gender').label).toBe('Gender')
    const fields = withQuestions([{ id: 'first_name', label: '', required: false }, { id: 'other', label: 'x' }], questions)
    expect(fields[0]).toMatchObject({ label: 'First Name', required: true })
    expect(fields[1]).toEqual({ id: 'other', label: 'x' })
  })
})

describe('handover sentences', () => {
  it('never promise JobDekho will submit, and say whose the window is', () => {
    expect(sentenceFor('review', 'review')).toBe('JobDekho has not pressed Submit and never will.')
    expect(sentenceFor('yours', 'sign-in')).toMatch(/never types passwords/)
    expect(sentenceFor('yours', 'human-check')).toMatch(/does not answer these/)
    expect(sentenceFor('filling')).toMatch(/from your profile/)
  })

  // The panel's bold head says the state; the sentence after it must not
  // say it again (the first real run read "Review and submit it yourself."
  // twice in a row).
  it('never repeat the banner\'s head', () => {
    const heads = [['review', 'review', 'Review and submit'], ['yours', 'closed', 'looks closed'], ['review', 'submitted', 'Looks submitted'], ['starting', null, 'Opening'], ['filling', null, 'Filling']]
    for (const [state, reason, head] of heads) expect(sentenceFor(state, reason)).not.toMatch(new RegExp(head, 'i'))
  })
})
