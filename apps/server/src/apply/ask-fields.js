import { NEVER_ASKED } from './sensitive-patterns.js'

// The questions on the page as the AI beside Apply assist sees them, and what
// it may do to each. Pure over the scan, so every rule here is tested without
// a browser.
//
// Off the list entirely, whatever the person says in the chat: a password, a
// code, a human check, money, an identity number (NEVER_ASKED), a file
// (attachments are prepared, never typed), and anything hidden or disabled.
// Those are the person's to do in the window. The other questions about the
// person (pay, notice period, consent, self-identification, how they heard
// of the job) are listed as "theirs": the prompt lets the AI set one only
// with what the person told it (see ask-prompt.js).
//
// A text box, a list or a search list is one question with its own id; a set
// of radio buttons or checkboxes is one question too, answered by the text of
// one of its options.
const off = (verdict) => verdict.kind === 'ignore' || verdict.kind === 'file'
  || (verdict.kind === 'personal' && NEVER_ASKED.has(verdict.category))

const labelOf = (f) => f.label || f.question || f.aria || f.placeholder || f.name || 'Unnamed field'
const short = (text, n) => String(text).replace(/\s+/g, ' ').trim().slice(0, n)

function kindOf(field, verdict) {
  if (field.tag === 'select') return { shown: 'pick one', act: 'select' }
  if (field.role === 'combobox' || verdict.via === 'combobox') return { shown: 'search list', act: 'combobox' }
  return { shown: field.tag === 'textarea' ? 'long text' : 'text', act: 'text' }
}

function addToggle(groups, list, byId, field, theirs) {
  const key = field.group ? `${field.type}:${field.group}` : field.fid
  let entry = groups.get(key)
  if (!entry) {
    const id = `g${groups.size + 1}`
    const question = { id, question: short(field.question || labelOf(field), 200), kind: field.type === 'radio' ? 'pick one' : 'tick any', required: field.required, options: [] }
    if (theirs) question.theirs = true
    entry = { question, act: { act: 'toggle', options: [] } }
    groups.set(key, entry)
    list.push(question)
    byId.set(id, entry.act)
  }
  const text = short(labelOf(field), 120)
  entry.question.options.push(text)
  entry.act.options.push({ fid: field.fid, text })
  if (field.checked) entry.question.answer = entry.question.answer ? `${entry.question.answer}, ${text}` : text
}

export function askFields(fields, verdicts) {
  const list = []
  const byId = new Map()
  const groups = new Map()
  fields.forEach((field, i) => {
    const verdict = verdicts[i]
    if (off(verdict)) return
    const theirs = verdict.kind === 'personal'
    if (field.type === 'radio' || field.type === 'checkbox') {
      addToggle(groups, list, byId, field, theirs)
      return
    }
    const { shown, act } = kindOf(field, verdict)
    const question = { id: field.fid, question: short(labelOf(field), 200), kind: shown, required: field.required, answer: field.preview || '' }
    if (field.options?.length) question.options = field.options.slice(0, 60).map((o) => short(o, 120))
    if (field.maxLength) question.maxLength = field.maxLength
    if (theirs) question.theirs = true
    list.push(question)
    byId.set(field.fid, { act, fid: field.fid, label: question.question })
  })
  return { list, byId }
}
