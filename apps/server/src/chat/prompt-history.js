// How much of the saved conversation (see packages/store/src/chat-history.js)
// rides along on the next question. The store keeps more turns than this so
// a person can scroll back further than the model has to reread on every
// call - a growing prompt would only make each answer slower for turns that
// happened minutes ago.
const MAX_HISTORY = 6

export function historyBlock(history = []) {
  const recent = history.slice(-MAX_HISTORY)
  if (!recent.length) return ''
  const lines = recent.map((turn) => `Q: ${turn.question}\nA: ${turn.answer}`)
  return `Earlier in this conversation:\n${lines.join('\n')}\n\n`
}
