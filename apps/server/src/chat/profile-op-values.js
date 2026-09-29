import { DEGREES } from '@jobdekho/core/degree.js'

// The values a profile op may carry, cleaned before anything is stored:
// model output bound for the career record, so it is clamped to the sizes
// the profile form itself works with and to the shapes the store keeps,
// the way chat/actions.js cleans a filter patch. A value that fails its
// check is dropped on its own; the rest of the op survives.

// Line breaks and control characters in a one-line field would only ever
// come from a model; a person's field is one line.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x1F\x7F]/g

export function text(value, max) {
  const raw = typeof value === 'number' && Number.isFinite(value) ? String(value) : value
  if (typeof raw !== 'string') return undefined
  return raw.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

export function textList(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return undefined
  return [...new Set(value.map((v) => text(v, maxLength)).filter(Boolean))].slice(0, maxItems)
}

const ENTRY_TEXT = { title: 200, organisation: 200, location: 120, startDate: 40, endDate: 40, link: 300 }
const ENTRY_LISTS = { bullets: [12, 400], tech: [30, 60] }
export const ENTRY_FIELDS = [...Object.keys(ENTRY_TEXT), ...Object.keys(ENTRY_LISTS)]

// The entry fields `raw` carries, each cleaned; unknown keys never pass.
export function entryFields(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [key, max] of Object.entries(ENTRY_TEXT)) {
    const value = Object.hasOwn(raw, key) ? text(raw[key], max) : undefined
    if (value !== undefined) out[key] = value
  }
  for (const [key, [items, length]] of Object.entries(ENTRY_LISTS)) {
    const value = Object.hasOwn(raw, key) ? textList(raw[key], items, length) : undefined
    if (value !== undefined) out[key] = value
  }
  return out
}

export const BASICS_TEXT = { name: 120, headline: 200, email: 200, phone: 60, location: 120 }
export const LINK_KEYS = ['github', 'linkedin', 'portfolio']
const LIST_FIELDS = { skills: [60, 60], titles: [25, 80], locations: [20, 80] }
export const SET_FIELDS = [...Object.keys(BASICS_TEXT), 'links', ...Object.keys(LIST_FIELDS), 'years', 'degree']
export const GROUP_NAME = 60
export const GROUP_ITEMS = [40, 60]

function links(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const out = {}
  for (const key of LINK_KEYS) {
    const link = Object.hasOwn(value, key) ? text(value[key], 300) : undefined
    if (link !== undefined) out[key] = link
  }
  return Object.keys(out).length ? out : undefined
}

function years(value) {
  if (value === null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 && n <= 60 ? n : undefined
}

// The cleaned value for a "set" op, or undefined when it is not one.
export function setValue(field, value) {
  if (Object.hasOwn(BASICS_TEXT, field)) return text(value, BASICS_TEXT[field])
  if (Object.hasOwn(LIST_FIELDS, field)) return textList(value, ...LIST_FIELDS[field])
  if (field === 'links') return links(value)
  if (field === 'years') return years(value)
  if (field === 'degree') return DEGREES.includes(value) ? value : undefined
  return undefined
}
