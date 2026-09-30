import { phoneFor } from './phone-format.js'

// What JobDekho will set on this page, and how, from the fields as read, their
// verdicts and the person's own values. Pure, so every rule below is tested
// without a browser. Only slots and files are ever planned: a personal field,
// a choice nobody could answer and a question needing the person's words
// never reach the plan at all.
//
// A field that already holds something is left alone, whoever put it there:
// the site's own resume reader (Lever, Ashby) or the person. JobDekho changes
// only what is empty.
const NUMERIC = new Set(['years', 'gradYear'])

function separateCountry(fields, verdicts, ats) {
  return verdicts.some((v, i) => v.kind === 'slot' && fields[i].visible
    && (v.slot === 'phoneCountry' || (ats === 'greenhouse' && v.slot === 'country')))
}

export function valueFor(slot, field, values, { split = false, via = 'text' } = {}) {
  const dial = values.phone?.dialCode
  if (slot === 'phone') return phoneFor(values.phone, { maxLength: field.maxLength, separateCountry: split })
  if (slot === 'phoneCountry') return via === 'text' ? dial ?? '' : values.country || (dial === '+91' ? 'India' : '')
  if (slot === 'country') return values.country || (dial === '+91' ? 'India' : '')
  const value = values[slot]
  return typeof value === 'string' ? value : ''
}

export function planFill({ fields, verdicts, values, files = {}, done = new Map(), ats = 'generic' }) {
  const split = separateCountry(fields, verdicts, ats)
  const steps = []
  fields.forEach((field, i) => {
    const verdict = verdicts[i]
    if (done.has(field.fid) || field.hasValue) return
    if (verdict.kind === 'file') {
      const file = verdict.slot ? files[verdict.slot] : null
      if (file) steps.push({ fid: field.fid, slot: verdict.slot, action: 'file', path: file.path, name: file.name })
      return
    }
    if (verdict.kind !== 'slot') return
    const value = valueFor(verdict.slot, field, values, { split, via: verdict.via })
    if (!value) return
    steps.push({ fid: field.fid, slot: verdict.slot, action: verdict.via, value, exact: NUMERIC.has(verdict.slot) })
  })
  // Files first: several sites read an attached resume and fill fields from
  // it, and the plan then leaves those values alone on the next pass.
  return steps.sort((a, b) => (a.action === 'file' ? 0 : 1) - (b.action === 'file' ? 0 : 1))
}
