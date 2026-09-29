// How much of the saved conversation (see packages/store/src/chat-history.js)
// rides along on the next question. The store keeps more turns than this so
// a person can scroll back further than the model has to reread on every
// call - a growing prompt would only make each answer slower for turns that
// happened minutes ago.
const MAX_HISTORY = 6

// What a turn offered and what became of it, so "now add the other one too"
// or "why didn't that work" can be answered, and so the model knows an
// offer the person discarded was not wanted. Summaries only: a document
// proposal's source is the next turn's open document if it was applied.
const STATUS = { pending: 'not applied yet', applied: 'applied', discarded: 'discarded' }

function offered(turn) {
  const proposals = turn.proposals ?? []
  if (!proposals.length) return ''
  return `\n(Offered: ${proposals.map((p) => `"${p.summary}", ${STATUS[p.status] ?? p.status}`).join('; ')})`
}

export function historyBlock(history = []) {
  const recent = history.slice(-MAX_HISTORY)
  if (!recent.length) return ''
  const lines = recent.map((turn) => `Q: ${turn.question}\nA: ${turn.answer}${offered(turn)}`)
  return `Earlier in this conversation:\n${lines.join('\n')}\n\n`
}
