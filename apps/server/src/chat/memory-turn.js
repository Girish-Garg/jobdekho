import { listMemory } from '@jobdekho/store/memory.js'
import { addMemory } from '@jobdekho/store/memory-items.js'
import { isMemoryCommand } from './memory-command.js'
import { memoriesForChat } from '../memory/picker.js'

// The memory a chat question is asked with: { items, saved }, `items` the
// preferences that bear on this question on this page (see memory/
// picker.js), `saved` every one in force, which a suggestion is checked
// against so it never repeats one the question did not bring along. Null
// when the person switched memory off, which leaves memory out of the
// prompt and the turn entirely.
export async function chatMemory(store, userId, { page, message } = {}) {
  const { enabled, items } = await listMemory(store, userId)
  return enabled ? { items: memoriesForChat(items, { page, message }), saved: items } : null
}

const savedChip = ({ item, replaced }, quote) => ({
  status: 'saved', id: item.id, text: item.text, scope: item.scope, quote,
  ...(replaced ? { replaces: replaced.id, replacedText: replaced.text } : {}),
})

// What becomes of a turn's suggestions (see memory-suggest.js), as the turn
// carries them to the panel and into the history:
//
//   [{ status: 'saved' | 'suggested', id?, text, scope, quote, replaces?, replacedText? }]
//
// Each waits for the person's Save, unless their own message asked for it to
// be kept ("remember...", see memory-command.js): then it is saved now, and
// its chip says so with Undo, so nothing is ever kept silently. One the store
// will not take (150 kept already) waits for a Save instead, which then says
// why.
export async function settleMemory(store, userId, message, suggestions = []) {
  if (!suggestions.length || !isMemoryCommand(message)) return suggestions.map((s) => ({ status: 'suggested', ...s }))
  const settled = []
  for (const suggestion of suggestions) {
    const saved = await addMemory(store, userId, suggestion)
    settled.push(saved.error ? { status: 'suggested', ...suggestion } : savedChip(saved, suggestion.quote))
  }
  return settled
}
