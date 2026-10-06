import { listMemory } from '@jobdekho/store/memory.js'
import { addMemory } from '@jobdekho/store/memory-items.js'
import { allChatMessages } from '@jobdekho/store/chat-messages.js'
import { readFeedback, noteFeedback } from '@jobdekho/store/memory-feedback.js'
import { isMemoryCommand } from './memory-command.js'
import { memoriesForChat } from '../memory/picker.js'
import { spotMemory } from '../memory/spot.js'
import { questionsFrom } from '../memory/habits.js'

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

const savedChip = ({ item, replaced }, { quote, source, topic }) => ({
  status: 'saved', id: item.id, text: item.text, scope: item.scope, quote, source, topic,
  ...(replaced ? { replaces: replaced.id, replacedText: replaced.text } : {}),
})

// What becomes of a turn's suggestions (see memory/spot.js), as the turn
// carries them to the panel and into the history:
//
//   [{ status: 'saved' | 'suggested', id?, text, scope, quote, source, topic?, why?, replaces?, replacedText? }]
//
// Each waits for the person's Save, unless their own message asked for it to
// be kept ("remember...", see memory-command.js): then it is saved now, and
// its chip says so with Undo, so nothing is ever kept silently. A habit
// offer always waits: the person never said it. One the store will not take
// (150 kept already) waits for a Save instead, which then says why.
export async function settleMemory(store, userId, message, suggestions = []) {
  const command = isMemoryCommand(message)
  const settled = []
  for (const suggestion of suggestions) {
    const saved = command && suggestion.source !== 'habit' ? await addMemory(store, userId, suggestion) : null
    settled.push(saved && !saved.error ? savedChip(saved, suggestion) : { status: 'suggested', ...suggestion })
  }
  return settled
}

// A turn's offers, settled and noted: the AI's own (`offered`, already
// traced back to the message) with what the local spotters found in the
// message and across the person's earlier questions, and each one written
// to the feedback log as offered, or saved by a "remember".
export async function memoryOffers(store, userId, { message, chatId, memory, offered = [] }) {
  if (!memory) return []
  const spotted = spotMemory({
    message, offered, chatId, saved: memory.saved ?? memory.items,
    past: questionsFrom(allChatMessages(store, userId)), feedback: readFeedback(store, userId),
  })
  const settled = await settleMemory(store, userId, message, spotted)
  noteFeedback(store, userId, settled.map((chip) => ({
    text: chip.text, source: chip.source, topic: chip.topic, outcome: chip.status === 'saved' ? 'saved' : 'offered',
  })))
  return settled
}
