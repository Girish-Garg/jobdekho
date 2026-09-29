import { normalizeProfile } from '@jobdekho/core/profile.js'
import { normalizeSections } from '@jobdekho/store/profile-sections.js'
import { BASICS_TEXT } from './profile-op-values.js'

// A cleaned op (see profile-ops-clean.js) against a record: whether it can
// apply, and the record after it does. The record is always held in the
// store's own normalized shape, the exact fields upsertProfile writes, so
// the diff a card shows (skills lowercased, entries renumbered) is what the
// store will hold, and so the resume text and the uploaded file's name are
// never in it to be overwritten.
export function normalizeWorking(record) {
  const src = record ?? {}
  return { ...normalizeProfile(src), ...normalizeSections(src, src) }
}

const entryIn = (working, section, id) => working[section].find((entry) => entry.id === id) ?? null
const groupIn = (working, id) => working.skillGroups.find((group) => group.id === id) ?? null
const ENTRY_TARGET = new Set(['update', 'remove'])
const GROUP_TARGET = new Set(['renameGroup', 'setGroupItems', 'removeGroup'])

// What an op overwrites, as it stood when the op was proposed. Compared
// again when the person presses Apply, so a card from an hour ago cannot
// quietly undo an edit made since (the skills typed by hand in between).
function snapshotOf(op, working) {
  if (op.op === 'update') return Object.fromEntries(Object.keys(op.fields).map((k) => [k, entryIn(working, op.section, op.id)[k]]))
  if (op.op === 'set' && op.field === 'links') return Object.fromEntries(Object.keys(op.value).map((k) => [k, working.basics.links[k]]))
  if (op.op === 'set') return Object.hasOwn(BASICS_TEXT, op.field) ? working.basics[op.field] : working[op.field]
  if (op.op === 'renameGroup') return groupIn(working, op.id).name
  if (op.op === 'setGroupItems') return groupIn(working, op.id).items
  return undefined
}

// The op as it is stored on the proposal: with the name of what it touches,
// taken from the record rather than the model, for the sentence a conflict
// needs, and with its snapshot.
export function stamp(op, working) {
  const out = { ...op }
  if (ENTRY_TARGET.has(op.op)) {
    const entry = entryIn(working, op.section, op.id)
    out.title = entry.title || entry.organisation
  }
  if (GROUP_TARGET.has(op.op)) out.group = groupIn(working, op.id).name
  const before = snapshotOf(op, working)
  return before === undefined ? out : { ...out, before }
}

const SECTION_NOUN = { experience: 'job', projects: 'project', education: 'education entry', certifications: 'certification', achievements: 'achievement' }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const nothing = 'Nothing was applied; ask again for a fresh change.'

// Null when `op` can apply to `working`, or the sentence saying why not.
export function conflictOf(op, working) {
  if (ENTRY_TARGET.has(op.op) && !entryIn(working, op.section, op.id)) {
    return `The ${SECTION_NOUN[op.section]} "${op.title ?? op.id}" this change edits is no longer in your profile. ${nothing}`
  }
  if (GROUP_TARGET.has(op.op) && !groupIn(working, op.id)) {
    return `The skill group "${op.group ?? op.id}" this change edits is no longer in your profile. ${nothing}`
  }
  if ('before' in op && !same(snapshotOf(op, working), op.before)) {
    const what = op.op === 'set' ? `Your ${op.field}` : op.group ? `The skill group "${op.group}"` : `The ${SECTION_NOUN[op.section]} "${op.title}"`
    return `${what} changed after this was proposed, and applying it would undo that. ${nothing}`
  }
  return null
}

const mapById = (list, id, change) => list.map((item) => (item.id === id ? change(item) : item))

function changed(op, w) {
  switch (op.op) {
    case 'add': return { [op.section]: op.position === 'first' ? [op.entry, ...w[op.section]] : [...w[op.section], op.entry] }
    case 'update': return { [op.section]: mapById(w[op.section], op.id, (e) => ({ ...e, ...op.fields })) }
    case 'remove': return { [op.section]: w[op.section].filter((e) => e.id !== op.id) }
    case 'addGroup': return { skillGroups: [...w.skillGroups, { name: op.name, items: op.items }] }
    case 'renameGroup': return { skillGroups: mapById(w.skillGroups, op.id, (g) => ({ ...g, name: op.name })) }
    case 'setGroupItems': return { skillGroups: mapById(w.skillGroups, op.id, (g) => ({ ...g, items: op.items })) }
    case 'removeGroup': return { skillGroups: w.skillGroups.filter((g) => g.id !== op.id) }
    default: break
  }
  if (op.field === 'links') return { basics: { ...w.basics, links: { ...w.basics.links, ...op.value } } }
  if (Object.hasOwn(BASICS_TEXT, op.field)) return { basics: { ...w.basics, [op.field]: op.value } }
  return { [op.field]: op.value }
}

// The record after `op`. Normalizing again gives a new entry its id and every
// entry its order, exactly as a hand edit saved through the form would.
export const applyOp = (op, working) => normalizeWorking({ ...working, ...changed(op, working) })
