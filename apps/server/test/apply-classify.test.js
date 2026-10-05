import { describe, it, expect } from 'vitest'
import { classify } from '@jobdekho/server/apply/field-classify.js'

// Descriptors shaped like the reader's, taken from the live pages surveyed for
// the design (Greenhouse, Lever, Ashby) and from ordinary forms.
const field = (over = {}) => ({
  tag: 'input', type: 'text', role: '', name: '', id: '', ac: '', aria: '', label: '', question: '',
  placeholder: '', auto: '', qa: '', required: false, visible: true, disabled: false, readOnly: false,
  hasValue: false, ...over,
})

describe('classify: facts JobDekho fills', () => {
  const slot = (f, ats) => classify(field(f), ats)
  it.each([
    [{ id: 'first_name', ac: 'given-name', label: 'First Name' }, 'firstName'],
    [{ id: 'last_name', label: 'Last Name' }, 'lastName'],
    [{ name: 'name', label: 'Full name' }, 'fullName'],
    [{ type: 'email', name: 'email', label: 'Email' }, 'email'],
    [{ type: 'tel', id: 'phone', label: 'Phone' }, 'phone'],
    [{ name: 'urls[LinkedIn]', label: 'LinkedIn URL' }, 'linkedin'],
    [{ name: 'urls[GitHub]', label: 'GitHub URL' }, 'github'],
    [{ name: 'urls[Portfolio]', label: 'Portfolio URL' }, 'portfolio'],
    [{ name: 'org', label: 'Current company' }, 'company'],
    [{ id: 'a4b8', label: 'Current/Most Recent Company Name' }, 'company'],
    [{ id: 'a173', label: 'Current/Most Recent Job Title' }, 'title'],
    [{ label: 'Total years of experience' }, 'years'],
    [{ label: 'College / University' }, 'school'],
    [{ label: 'Year of graduation' }, 'gradYear'],
    [{ label: 'Current location', placeholder: 'City' }, 'city'],
    [{ label: 'मोबाइल नंबर' }, 'phone'],
  ])('%o is %s', (f, expected) => {
    expect(slot(f)).toMatchObject({ kind: 'slot', slot: expected })
  })

  it('uses the known names of each ATS before the words', () => {
    expect(slot({ id: 'candidate-location', role: 'combobox', label: 'Location (City)' }, 'greenhouse')).toEqual({ kind: 'slot', slot: 'city', via: 'combobox' })
    expect(slot({ name: 'location', label: 'Current location' }, 'lever')).toEqual({ kind: 'slot', slot: 'city', via: 'combobox' })
    expect(slot({ name: '_systemfield_name', id: '_systemfield_name', label: 'Full Name' }, 'ashby').slot).toBe('fullName')
  })

  it('reads a select as a list to pick from', () => {
    expect(slot({ tag: 'select', label: 'Country' })).toEqual({ kind: 'slot', slot: 'country', via: 'select' })
  })

  it('knows a resume from a cover letter by what the file input says', () => {
    expect(slot({ type: 'file', id: 'resume', label: 'Resume/CV' })).toEqual({ kind: 'file', slot: 'resume' })
    expect(slot({ type: 'file', id: 'cover_letter', label: 'Cover Letter' })).toEqual({ kind: 'file', slot: 'cover' })
    expect(slot({ type: 'file', label: 'Portfolio sample' })).toEqual({ kind: 'file', slot: null })
    expect(slot({ type: 'file', label: 'Resume', visible: false })).toMatchObject({ kind: 'file', slot: 'resume' })
  })

  // A page names its own fields, and a name every plain object answers to
  // (constructor, toString) once read as a slot of its own.
  it('reads a field named like a property every object has by what it says', () => {
    expect(slot({ type: 'email', name: 'email', label: 'Email', ac: 'constructor' })).toMatchObject({ kind: 'slot', slot: 'email' })
    expect(slot({ type: 'email', id: 'toString', label: 'Email' }, 'greenhouse')).toMatchObject({ kind: 'slot', slot: 'email' })
    expect(slot({ type: 'file', id: 'constructor', name: 'Constructor', label: 'Resume/CV' }, 'lever')).toEqual({ kind: 'file', slot: 'resume' })
  })
})

describe('classify: never the candidate', () => {
  it.each([
    [{ label: "Referrer's name" }],
    [{ label: 'Name on card' }],
    [{ label: "Father's name" }],
    [{ label: 'Emergency contact name' }],
    [{ label: 'Preferred work location' }],
  ])('%o is not filled from the profile', (f) => {
    const verdict = classify(field(f))
    expect(verdict.kind === 'slot' && ['fullName', 'city'].includes(verdict.slot)).toBe(false)
  })
})

describe('classify: the person\'s own', () => {
  it.each([
    [{ type: 'password', label: 'Create a password' }, 'password'],
    [{ ac: 'one-time-code', label: 'Code' }, 'code'],
    [{ label: 'Enter the OTP sent to your phone' }, 'code'],
    [{ tag: 'select', label: 'Gender (voluntary self-identification)' }, 'self-id'],
    [{ type: 'radio', name: '075d__systemfield_eeoc_race', label: 'Asian' }, 'self-id'],
    [{ label: 'Date of birth' }, 'identity'],
    [{ label: 'PAN number' }, 'identity'],
    [{ label: 'आधार संख्या' }, 'identity'],
    [{ label: 'Expected CTC (in LPA)' }, 'salary'],
    [{ role: 'combobox', label: 'What is the notice period in your current employment?' }, 'unknown'],
    [{ role: 'combobox', label: 'Do you provide your consent for us to conduct your background verification (BGV)?' }, 'consent'],
    [{ type: 'checkbox', label: 'I agree to the privacy policy' }, 'consent'],
    [{ label: 'Card number', ac: 'cc-number' }, 'payment'],
    [{ label: 'Pay the application fee' }, 'payment'],
  ])('%o is %s', (f, category) => {
    expect(classify(field(f))).toEqual({ kind: 'personal', category })
  })

  it('reads consent into choices only, so a resume that mentions a policy is still a resume', () => {
    expect(classify(field({ type: 'file', label: 'Resume (see our privacy policy)' }))).toMatchObject({ kind: 'file', slot: 'resume' })
  })
})

describe('classify: left for the person', () => {
  it('leaves hidden, disabled and read-only fields out', () => {
    expect(classify(field({ label: 'Email', visible: false }))).toEqual({ kind: 'ignore' })
    expect(classify(field({ label: 'Email', disabled: true }))).toEqual({ kind: 'ignore' })
  })

  it('never answers a question nobody could, nor a lone toggle', () => {
    expect(classify(field({ tag: 'textarea', label: 'Why do you want to work at Acme?' }))).toEqual({ kind: 'free-text' })
    expect(classify(field({ tag: 'select', label: 'Preferred shift' }))).toEqual({ kind: 'choice' })
    expect(classify(field({ type: 'checkbox', label: 'Email' }))).toEqual({ kind: 'choice' })
    expect(classify(field({ label: 'Anything else?' }))).toEqual({ kind: 'text' })
  })
})
