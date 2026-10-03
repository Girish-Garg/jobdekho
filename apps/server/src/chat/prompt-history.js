// How much of the chat's saved turns (see packages/store/src/
// chat-messages.js) rides along on the next question. The store keeps more
// turns than this so a person can scroll back further than the model has to
// reread on every call - a growing prompt would only make each answer slower
// for turns that happened minutes ago.
export const MAX_HISTORY = 6

// What a turn offered and what became of it, so "now add the other one too"
// or "why didn't that work" can be answered, and so the model knows an
// offer the person discarded was not wanted. Summaries only: a document
// proposal's source is the next turn's document if it was applied. A
// change that could not be made carries its reason, so "why is there no
// card?" gets the true answer and the next attempt can avoid the mistake.
const STATUS = { pending: 'not applied yet', applied: 'applied', discarded: 'discarded', refused: 'could not be made' }

const outcome = (p) => `${STATUS[p.status] ?? p.status}${p.status === 'refused' && p.reason ? ` (${p.reason})` : ''}`

function offered(turn) {
  const proposals = turn.proposals ?? []
  if (!proposals.length) return ''
  return `\n(Offered: ${proposals.map((p) => `"${p.summary}", ${outcome(p)}`).join('; ')})`
}

// What the chat held when the turn was asked, by name: "[Razorpay] Q: ...".
// A comparison grows and shrinks, and without the label an answer about
// Razorpay reads as one about whichever jobs the chat holds now. A turn
// that held nothing, or only items with no name left, has no label.
function labelOf(turn, names) {
  const ids = [...(turn.items?.jobs ?? []), ...(turn.items?.documents ?? [])]
  const known = ids.map((id) => names.get(id)).filter(Boolean)
  return known.length ? `[${known.join(', ')}] ` : ''
}

export function historyBlock(history = [], names = new Map()) {
  const recent = history.slice(-MAX_HISTORY)
  if (!recent.length) return ''
  const lines = recent.map((turn) => `${labelOf(turn, names)}Q: ${turn.question}\nA: ${turn.answer}${offered(turn)}`)
  return `Earlier in this conversation:\n${lines.join('\n')}\n\n`
}
