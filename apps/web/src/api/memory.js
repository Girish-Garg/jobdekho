import { req } from './request.js';

// What the chat remembers of the person (see the server's api/memory.js).
// An item is { id, text, scope, quote, createdAt, updatedAt, replaces,
// archived }, scope one of everywhere, jobs, resume or letters.

// { enabled, items, archived }: the switch, the items in force, and how many
// replaced ones are kept for an Undo.
export function getMemory() {
  return req('/api/memory');
}

// A chip's Save or a line written by hand: { item, replaced }, `replaced`
// the { id, text } this one took the place of. The same words saved again
// answer with the item already kept.
export function saveMemory({ text, scope, quote = null, replaces = null }) {
  return req('/api/memory', { method: 'POST', body: JSON.stringify({ text, scope, quote, replaces }) });
}

// { text }, { scope } or both; { restore: true } brings back a replaced one.
// Resolves { item }.
export function editMemory(id, change) {
  return req(`/api/memory/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(change) });
}

export function deleteMemory(id) {
  return req(`/api/memory/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// "Forget everything", the replaced items kept for an Undo too.
export function forgetMemory() {
  return req('/api/memory', { method: 'DELETE' });
}

export function setMemoryEnabled(enabled) {
  return req('/api/memory/settings', { method: 'PUT', body: JSON.stringify({ enabled }) });
}
