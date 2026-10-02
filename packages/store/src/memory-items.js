import { randomBytes } from 'node:crypto'
import { toIso } from './timestamp.js'
import { MEMORY_SCOPES, MAX_MEMORY_TEXT, MAX_MEMORIES, cleanMemoryText, memoryKey, readMemory, activeItems } from './memory.js'

// Saving and changing what the chat remembers (see memory.js for the shape).
// Each refusal is a word, not a sentence: 'empty', 'long', 'scope', 'full',
// 'duplicate' or 'missing', which the caller says to the person in its own
// words (see apps/server/src/api/memory.js).

// An archived item is kept so an Undo can bring it back, which happens
// minutes after it was replaced, not years; past this many the oldest go.
const MAX_ARCHIVED = 50
const MAX_QUOTE = 300

// Short, so a model asked to name the item a new one replaces can copy its
// id exactly, and checked against the person's own so two never collide.
function newId(items) {
  for (;;) {
    const id = randomBytes(4).toString('hex')
    if (!items.some((item) => item.id === id)) return id
  }
}

export function checkMemoryInput({ text, scope }) {
  const clean = cleanMemoryText(text)
  if (!clean) return { error: 'empty' }
  if (clean.length > MAX_MEMORY_TEXT) return { error: 'long' }
  if (!MEMORY_SCOPES.includes(scope)) return { error: 'scope' }
  return { text: clean, scope }
}

const inForce = (items, id) => items.find((item) => item.id === id && !item.archived) ?? null
const sameAs = (items, text, except = null) => items.find((item) => !item.archived && item.id !== except && memoryKey(item.text) === memoryKey(text)) ?? null

function pruned(items) {
  const archived = items.filter((item) => item.archived).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  const gone = new Set(archived.slice(MAX_ARCHIVED).map((item) => item.id))
  return gone.size ? items.filter((item) => !gone.has(item.id)) : items
}

const write = (store, userId, record, items) => store.memory.set(userId, { ...record, items: pruned(items) })

// Saves one item: { item, replaced, existing }. One in force that says the
// same thing is answered as it is (`existing`), so a chip pressed twice, or
// an old chip pressed again, never keeps a second copy. `replaces` names an
// item in force this one takes the place of; it is archived and comes back
// as `replaced`. One that is not in force any more is let go quietly.
export async function addMemory(store, userId, input, now = new Date()) {
  const checked = checkMemoryInput(input)
  if (checked.error) return checked
  const record = readMemory(store, userId)
  const same = sameAs(record.items, checked.text)
  if (same) return { item: same, replaced: null, existing: true }
  const old = inForce(record.items, input.replaces)
  if (activeItems(record).length - (old ? 1 : 0) >= MAX_MEMORIES) return { error: 'full' }
  const at = toIso(now)
  const quote = cleanMemoryText(input.quote).slice(0, MAX_QUOTE) || null
  const item = { id: newId(record.items), ...checked, quote, createdAt: at, updatedAt: at, replaces: old?.id ?? null, archived: false }
  const replaced = old ? { ...old, archived: true, updatedAt: at } : null
  write(store, userId, record, [...record.items.map((x) => (x === old ? replaced : x)), item])
  return { item, replaced, existing: false }
}

// Changes the text, the scope or both of an item in force: { item }.
export async function editMemory(store, userId, id, change, now = new Date()) {
  const record = readMemory(store, userId)
  const current = inForce(record.items, id)
  if (!current) return { error: 'missing' }
  const checked = checkMemoryInput({ text: change.text ?? current.text, scope: change.scope ?? current.scope })
  if (checked.error) return checked
  if (sameAs(record.items, checked.text, id)) return { error: 'duplicate' }
  const item = { ...current, ...checked, updatedAt: toIso(now) }
  write(store, userId, record, record.items.map((x) => (x.id === id ? item : x)))
  return { item }
}

function setArchived(store, userId, id, archived, now) {
  const record = readMemory(store, userId)
  const current = record.items.find((item) => item.id === id)
  if (!current) return { error: 'missing' }
  if (current.archived === archived) return { item: current }
  if (!archived && activeItems(record).length >= MAX_MEMORIES) return { error: 'full' }
  if (!archived && sameAs(record.items, current.text)) return { error: 'duplicate' }
  const item = { ...current, archived, updatedAt: toIso(now) }
  write(store, userId, record, record.items.map((x) => (x.id === id ? item : x)))
  return { item }
}

export const archiveMemory = async (store, userId, id, now = new Date()) => setArchived(store, userId, id, true, now)

// Undo of a replacement: the item it replaced is in force again.
export const restoreMemory = async (store, userId, id, now = new Date()) => setArchived(store, userId, id, false, now)
