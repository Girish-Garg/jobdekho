import { describe, it, expect } from 'vitest'
import { profileValues, splitName } from '@jobdekho/server/apply/profile-values.js'
import { phoneForms, phoneFor } from '@jobdekho/server/apply/phone-format.js'
import { planFill } from '@jobdekho/server/apply/fill-plan.js'
import { checklistRows } from '@jobdekho/server/apply/checklist.js'
import { classify } from '@jobdekho/server/apply/field-classify.js'

// The demo profile's shape (see the fictional demo data folder).
const PROFILE = {
  basics: { name: 'Demo Candidate', email: 'demo@example.com', phone: '+91 90000 00000', location: 'Pune, India', links: { github: 'github.com/demo', linkedin: 'linkedin.com/in/demo', portfolio: '' } },
  experience: [{ title: 'Software Engineer', organisation: 'Startup Co', startDate: 'Jul 2023', endDate: 'Present' }],
  education: [{ title: 'B.Tech, Computer Engineering', organisation: 'COEP', startDate: '2019', endDate: '2023' }],
  years: 2,
}

describe('profileValues', () => {
  it('reads the facts an application asks for, and nothing else', () => {
    const v = profileValues(PROFILE)
    expect(v).toMatchObject({
      fullName: 'Demo Candidate', firstName: 'Demo', lastName: 'Candidate', nameCheck: false, email: 'demo@example.com',
      city: 'Pune', country: 'India', linkedin: 'https://linkedin.com/in/demo', github: 'https://github.com/demo', portfolio: '',
      company: 'Startup Co', title: 'Software Engineer', years: '2', school: 'COEP', degree: 'B.Tech', discipline: 'Computer Engineering', gradYear: '2023',
    })
    expect(profileValues(null).fullName).toBe('')
  })

  it('splits names on the last space and flags the guesses', () => {
    expect(splitName('Karthik')).toEqual({ first: 'Karthik', last: '', check: true })
    expect(splitName('Venkata Sai Krishna Reddy')).toEqual({ first: 'Venkata Sai Krishna', last: 'Reddy', check: true })
    expect(splitName('Asha Rao')).toEqual({ first: 'Asha', last: 'Rao', check: false })
  })

  it('writes one phone number the ways forms want it', () => {
    const forms = phoneForms('+91 90000 00000')
    expect(forms).toEqual({ asWritten: '+91 90000 00000', national: '9000000000', full: '+919000000000', dialCode: '+91' })
    expect(phoneFor(forms)).toBe('+91 90000 00000')
    expect(phoneFor(forms, { separateCountry: true })).toBe('9000000000')
    expect(phoneFor(forms, { maxLength: 13 })).toBe('+919000000000')
    expect(phoneFor(forms, { maxLength: 10 })).toBe('9000000000')
    expect(phoneForms('')).toBeNull()
  })
})

const f = (fid, over) => ({ fid, tag: 'input', type: 'text', role: '', name: '', id: '', ac: '', aria: '', label: '', question: '', placeholder: '', auto: '', qa: '', required: false, visible: true, disabled: false, readOnly: false, hasValue: false, preview: '', rect: { x: 0, y: Number(fid.slice(1)) * 40, w: 200, h: 30 }, ...over })

const FORM = [
  f('f1', { id: 'first_name', label: 'First Name', required: true }),
  f('f2', { id: 'last_name', label: 'Last Name', required: true }),
  f('f3', { type: 'email', label: 'Email', hasValue: true, preview: 'old@example.com' }),
  f('f4', { role: 'combobox', label: 'Country code' }),
  f('f5', { type: 'tel', label: 'Phone' }),
  f('f6', { type: 'file', label: 'Resume/CV', required: true }),
  f('f7', { tag: 'select', label: 'Gender' }),
  f('f8', { tag: 'textarea', label: 'Why us?', required: true }),
  f('f9', { tag: 'select', label: 'Years of experience' }),
  f('f10', { type: 'radio', name: 'auth', group: 'auth', label: 'Yes', question: 'Authorised to work in India?' }),
  f('f11', { type: 'radio', name: 'auth', group: 'auth', label: 'No', question: 'Authorised to work in India?' }),
]
const VERDICTS = FORM.map((field) => classify(field))
const FILES = { resume: { path: '/tmp/x/Demo Candidate Resume.pdf', name: 'Demo Candidate Resume.pdf' }, cover: null }

describe('planFill', () => {
  const steps = planFill({ fields: FORM, verdicts: VERDICTS, values: profileValues(PROFILE), files: FILES })

  it('attaches files first, then fills what the profile knows', () => {
    expect(steps[0]).toMatchObject({ fid: 'f6', action: 'file', name: 'Demo Candidate Resume.pdf' })
    expect(steps.map((s) => s.fid)).toEqual(['f6', 'f1', 'f2', 'f4', 'f5', 'f9'])
  })

  it('splits the phone when the country is asked for beside it', () => {
    expect(steps.find((s) => s.fid === 'f4')).toMatchObject({ action: 'combobox', value: 'India' })
    expect(steps.find((s) => s.fid === 'f5')).toMatchObject({ action: 'text', value: '9000000000' })
  })

  it('never plans a personal field, a question, or one that already holds something', () => {
    const planned = new Set(steps.map((s) => s.fid))
    for (const fid of ['f3', 'f7', 'f8', 'f10', 'f11']) expect(planned.has(fid)).toBe(false)
    expect(steps.find((s) => s.fid === 'f9')).toMatchObject({ action: 'select', value: '2', exact: true })
  })

  it('skips fields already done on this page, and a resume it has no file for', () => {
    const again = planFill({ fields: FORM, verdicts: VERDICTS, values: profileValues(PROFILE), files: {}, done: new Map([['f1', 'filled']]) })
    expect(again.map((s) => s.fid)).toEqual(['f2', 'f4', 'f5', 'f9'])
  })
})

describe('checklistRows', () => {
  const results = new Map([['f1', 'filled'], ['f2', 'failed'], ['f6', 'attached']])
  const rows = checklistRows({ fields: FORM, verdicts: VERDICTS, results })
  const byLabel = Object.fromEntries(rows.map((r) => [r.label, r]))

  it('says what JobDekho did and what is left, in page order', () => {
    expect(byLabel['First Name'].status).toBe('filled')
    expect(byLabel['Last Name'].status).toBe('failed')
    expect(byLabel['Resume/CV'].status).toBe('attached')
    expect(byLabel.Email).toMatchObject({ status: 'kept', preview: 'old@example.com' })
    expect(byLabel['Why us?']).toMatchObject({ status: 'you', note: 'Needs your answer.' })
    expect(byLabel.Gender).toMatchObject({ status: 'you', preview: '' })
    expect(rows.map((r) => r.rect.y)).toEqual([...rows.map((r) => r.rect.y)].sort((a, b) => a - b))
  })

  // The AI beside the form helps with Gender when told; a password never.
  it('says which questions the AI beside the form may help with', () => {
    expect(byLabel.Gender.askable).toBe(true)
    expect(byLabel['Why us?'].askable).toBe(true)
    const login = checklistRows({ fields: [{ ...FORM[0], fid: 'p1', type: 'password', label: 'Password' }], verdicts: [{ kind: 'personal', category: 'password' }] })
    expect(login[0]).toMatchObject({ label: 'Password', askable: false })
  })

  it('shows a radio group as one question, done once any option is picked', () => {
    const group = rows.filter((r) => r.label === 'Authorised to work in India?')
    expect(group).toHaveLength(1)
    const picked = FORM.map((field) => (field.fid === 'f11' ? { ...field, checked: true } : field))
    expect(checklistRows({ fields: picked, verdicts: VERDICTS }).find((r) => r.label === 'Authorised to work in India?').status).toBe('done')
  })
})
