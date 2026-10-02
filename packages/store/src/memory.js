// What the chat keeps of the person's lasting preferences: short lines in
// their own words, each saved by their own click or their own "remember"
// (see apps/server/src/chat/memory-turn.js), in a file of their own so they
// can be read, changed and deleted like anything else they made.
//
// One record per user, { enabled, items }. `enabled` is the person's switch
// for the whole of it, on until they turn it off. An item is
//
//   { id, text, scope, quote, createdAt, updatedAt, replaces, archived }
//
// `scope` says which AI calls read it, `quote` the words of a chat message it
// came from (null for one written by hand), `replaces` the item it took the
// place of. That one is archived rather than deleted, so an Undo can bring
// it back. Adding and changing items is in memory-items.js.
export const MEMORY_SCOPES = ['everywhere', 'jobs', 'resume', 'letters']
export const MAX_MEMORY_TEXT = 200
export const MAX_MEMORIES = 150

// One line, as every prompt shows it: a line break typed into the box would
// split one preference into what reads as two.
export const cleanMemoryText = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '')

// Two lines that differ only in case, spacing or a closing full stop say the
// same thing, and a second copy is never kept.
export const memoryKey = (text) => cleanMemoryText(text).toLowerCase().replace(/[.!\s]+$/, '')

const text = (value) => (typeof value === 'string' && value ? value : null)

// A file edited by hand still reads: an item without an id or a text is
// dropped, an unknown scope reads as everywhere.
function itemOf(raw) {
  if (!raw || !text(raw.id) || !cleanMemoryText(raw.text)) return null
  return {
    id: raw.id,
    text: cleanMemoryText(raw.text),
    scope: MEMORY_SCOPES.includes(raw.scope) ? raw.scope : 'everywhere',
    quote: text(raw.quote),
    createdAt: text(raw.createdAt),
    updatedAt: text(raw.updatedAt),
    replaces: text(raw.replaces),
    archived: raw.archived === true,
  }
}

export function readMemory(store, userId) {
  const record = store.memory.get(userId)
  return {
    enabled: record?.enabled !== false,
    items: (Array.isArray(record?.items) ? record.items : []).map(itemOf).filter(Boolean),
  }
}

export const activeItems = (record) => record.items.filter((item) => !item.archived)

// What the person sees: the switch, the items in force in the order they
// were saved, and how many replaced ones are kept for an Undo, which
// "Forget everything" removes too.
export async function listMemory(store, userId) {
  const record = readMemory(store, userId)
  const items = activeItems(record)
  return { enabled: record.enabled, items, archived: record.items.length - items.length }
}

export async function setMemoryEnabled(store, userId, enabled) {
  const record = readMemory(store, userId)
  store.memory.set(userId, { ...record, enabled: enabled === true })
  return enabled === true
}

// Every item, archived ones included. The switch stays as the person left it.
export async function forgetMemory(store, userId) {
  const record = readMemory(store, userId)
  store.memory.set(userId, { ...record, items: [] })
}

// False when no item has that id, in force or archived.
export async function deleteMemory(store, userId, id) {
  const record = readMemory(store, userId)
  const items = record.items.filter((item) => item.id !== id)
  if (items.length === record.items.length) return false
  store.memory.set(userId, { ...record, items })
  return true
}
