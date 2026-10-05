import { SLOT_PATTERNS, SLOT_GUARDS, FILE_PATTERNS, DECLARED } from './field-patterns.js'
import { PERSONAL, CHOICE_ONLY } from './sensitive-patterns.js'
import { hintFor, suggests } from './ats-hints.js'

// What one field is, as a verdict the fill plan and the checklist act on.
// Pure over the reader's description, so the whole policy is table-tested
// without a browser. Fail-closed: anything personal is decided first, and a
// field matching nothing is left for the person rather than guessed at.
//
//   { kind: 'ignore' }                      hidden, disabled or read-only
//   { kind: 'personal', category }          never filled: the person's own
//   { kind: 'file', slot }                  resume, cover, or null (unknown)
//   { kind: 'slot', slot, via }             a known fact; via text, select, combobox
//   { kind: 'choice' }                      a list or toggle nobody could answer
//   { kind: 'text' } / { kind: 'free-text' } words only the person can write
export const squash = (text) => String(text || '').toLowerCase().replace(/[_\-.[\]]+/g, ' ').replace(/\s+/g, ' ').trim()

export const wordsOf = (f) => squash([f.name, f.id, f.ac, f.aria, f.label, f.placeholder, f.auto, f.qa, f.question].join(' '))

const SECRET_AC = /(current-password|new-password|one-time-code|cc-|bday|sex)/

const isChoice = (f) => f.tag === 'select' || f.type === 'radio' || f.type === 'checkbox' || f.role === 'combobox'

function personalOf(f, words) {
  if (f.type === 'password') return 'password'
  if (SECRET_AC.test(f.ac)) return /one-time/.test(f.ac) ? 'code' : /cc-/.test(f.ac) ? 'payment' : /password/.test(f.ac) ? 'password' : /sex/.test(f.ac) ? 'self-id' : 'identity'
  for (const [category, pattern] of PERSONAL) {
    if (CHOICE_ONLY.has(category) && !isChoice(f)) continue
    if (pattern.test(words)) return category
  }
  return null
}

function namedSlot(words) {
  for (const [slot, pattern] of SLOT_PATTERNS) {
    if (!pattern.test(words)) continue
    if (SLOT_GUARDS[slot]?.test(words)) continue
    return slot
  }
  return null
}

function viaOf(f, ats) {
  if (f.tag === 'select') return 'select'
  if (f.role === 'combobox' || suggests(ats, f)) return 'combobox'
  if (f.type === 'radio' || f.type === 'checkbox') return 'toggle'
  return 'text'
}

export function classify(f, ats = 'generic') {
  if ((!f.visible && f.type !== 'file') || f.disabled || f.readOnly) return { kind: 'ignore' }
  const words = wordsOf(f)
  const category = personalOf(f, words)
  if (category) return { kind: 'personal', category }
  if (f.type === 'file') {
    const found = FILE_PATTERNS.find(([, pattern]) => pattern.test(words))
    return { kind: 'file', slot: hintFor(ats, f) ?? found?.[0] ?? null }
  }
  // The page's own autocomplete word: only DECLARED's own keys count, or
  // "constructor" would name a slot.
  const declared = Object.hasOwn(DECLARED, f.ac) ? DECLARED[f.ac] : null
  const slot = declared ?? hintFor(ats, f) ?? namedSlot(words)
  const via = viaOf(f, ats)
  // A slot is only ever answered by typing or by picking from a list; a
  // lone checkbox or radio is a question for the person whatever it says.
  if (slot && via !== 'toggle') return { kind: 'slot', slot, via }
  if (isChoice(f)) return { kind: 'choice' }
  return { kind: f.tag === 'textarea' ? 'free-text' : 'text' }
}
