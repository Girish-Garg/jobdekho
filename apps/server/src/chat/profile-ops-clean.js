import { ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'
import { entryFields, setValue, SET_FIELDS, text, textList, GROUP_NAME, GROUP_ITEMS } from './profile-op-values.js'

// One operation from the model's proposal, reduced to a shape the server
// understands, or null. Only these ops, only these sections and fields; an
// id is kept as a string here and checked against the record in
// profile-ops-apply.js. An "add" never carries an id: the store assigns one
// when it is applied, so a model cannot pick an id that collides with, or
// impersonates, an entry already there.
//
//   { op: 'add', section, entry, position: 'first' | 'last' }
//   { op: 'update', section, id, fields }        only the fields to change
//   { op: 'remove', section, id }
//   { op: 'set', field, value }                  see SET_FIELDS
//   { op: 'addGroup', name, items }
//   { op: 'renameGroup', id, name }
//   { op: 'setGroupItems', id, items }
//   { op: 'removeGroup', id }
const idOf = (value) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, 100) : undefined)

const ENTRY_OPS = {
  add: (raw) => {
    const entry = entryFields(raw.entry)
    if (!entry.title && !entry.organisation) return null
    return { entry, position: raw.position === 'first' ? 'first' : 'last' }
  },
  update: (raw) => {
    const id = idOf(raw.id)
    const fields = entryFields(raw.fields)
    return id && Object.keys(fields).length ? { id, fields } : null
  },
  remove: (raw) => (idOf(raw.id) ? { id: idOf(raw.id) } : null),
}

const OTHER_OPS = {
  set: (raw) => {
    if (!SET_FIELDS.includes(raw.field)) return null
    const value = setValue(raw.field, raw.value)
    return value === undefined ? null : { field: raw.field, value }
  },
  addGroup: (raw) => {
    const name = text(raw.name, GROUP_NAME)
    return name ? { name, items: textList(raw.items, ...GROUP_ITEMS) ?? [] } : null
  },
  renameGroup: (raw) => {
    const name = text(raw.name, GROUP_NAME)
    return idOf(raw.id) && name ? { id: idOf(raw.id), name } : null
  },
  setGroupItems: (raw) => {
    const items = textList(raw.items, ...GROUP_ITEMS)
    return idOf(raw.id) && items ? { id: idOf(raw.id), items } : null
  },
  removeGroup: (raw) => (idOf(raw.id) ? { id: idOf(raw.id) } : null),
}

// Own keys only: "constructor" as an op name must not find a function.
export function cleanOp(raw) {
  const op = typeof raw?.op === 'string' ? raw.op : ''
  if (Object.hasOwn(ENTRY_OPS, op)) {
    if (!ENTRY_SECTIONS.includes(raw.section)) return null
    const body = ENTRY_OPS[op](raw)
    return body ? { op, section: raw.section, ...body } : null
  }
  const body = Object.hasOwn(OTHER_OPS, op) ? OTHER_OPS[op](raw) : null
  return body ? { op, ...body } : null
}
