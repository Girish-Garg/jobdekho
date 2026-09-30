import { NOTES } from './sensitive-patterns.js'

// The checklist beside the live view: one row per question a person would
// recognise, in page order, saying what JobDekho did and what is left.
//
//   filled, attached   JobDekho set it
//   kept               it already held something, and was left alone
//   done               the person answered it
//   you                the person's to answer
//   skipped            optional, and JobDekho had nothing for it
//   failed             JobDekho tried and the page did not take it
const SLOT_NOTES = { resume: 'No resume PDF to attach yet: pick one when the site asks.' }

const labelOf = (f) => f.label || f.question || f.aria || f.placeholder || f.name || 'Unnamed field'

function statusOf(field, verdict, result) {
  if (result === 'filled' || result === 'attached' || result === 'failed' || result === 'kept') return { status: result }
  if (verdict.kind === 'personal') return field.hasValue ? { status: 'done' } : { status: 'you', note: NOTES[verdict.category] }
  if (field.hasValue) return { status: verdict.kind === 'slot' || verdict.kind === 'file' ? 'kept' : 'done' }
  if (verdict.kind === 'slot' || verdict.kind === 'file') {
    return field.required ? { status: 'you', note: SLOT_NOTES[verdict.slot] ?? 'Your profile has nothing for this one.' } : { status: 'skipped' }
  }
  if (!field.required) return { status: 'skipped', note: 'Optional.' }
  return { status: 'you', note: verdict.kind === 'choice' ? 'Pick one yourself.' : 'Needs your answer.' }
}

// Radio buttons and checkbox sets are one question each, however many
// options they have.
function groupKey(field) {
  return (field.type === 'radio' || field.type === 'checkbox') && field.group ? `group:${field.group}` : field.fid
}

export function checklistRows({ fields, verdicts, results = new Map() }) {
  const rows = new Map()
  fields.forEach((field, i) => {
    const verdict = verdicts[i]
    if (verdict.kind === 'ignore') return
    const key = groupKey(field)
    const row = rows.get(key)
    if (row) {
      if (field.checked) row.status = 'done'
      return
    }
    const grouped = key !== field.fid
    const label = grouped ? field.question || labelOf(field) : labelOf(field)
    const { status, note } = statusOf({ ...field, hasValue: grouped ? field.checked : field.hasValue }, verdict, results.get(field.fid))
    const personal = verdict.kind === 'personal'
    rows.set(key, {
      fid: field.fid,
      label: label.slice(0, 120),
      status,
      note: note ?? null,
      required: field.required,
      // Nothing personal is echoed back, even to the person's own screen.
      preview: personal || grouped ? '' : field.preview,
      rect: field.rect,
    })
  })
  return [...rows.values()].sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x)
}
