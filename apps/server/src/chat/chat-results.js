import { getChatMessages } from '@jobdekho/store/chat-messages.js'

// The job results a chat shows: the versions asked in it, which carry its
// id (see packages/store/src/ai-results.js), from after it was last
// cleared. Only a job's own chat has any, since every action on a job runs
// there (see api/posting-ai.js), and a result never shows in another chat.
//
//   [{ kind, postingId, dropped, versions: [{ instruction, provider, createdAt, result, chatId }] }]
export async function chatResults(dashboard, userId, chat, clearedAt = null) {
  if (chat.kind !== 'job') return []
  const records = await dashboard.listAiResults(userId, chat.jobs[0])
  const shown = (version) => version.chatId === chat.id && (!clearedAt || version.createdAt > clearedAt)
  return records
    .map((record) => ({ kind: record.kind, postingId: record.postingId, dropped: Boolean(record.dropped), versions: (record.versions ?? []).filter(shown) }))
    .filter((record) => record.versions.length)
}

// When the chat's newest answer landed, a turn's or a result's, or null for
// none. A note that a job action started in another chat is not an answer.
export function lastAnswerAt(turns, results) {
  const times = [
    ...turns.filter((turn) => !turn.note).map((turn) => turn.createdAt),
    ...results.flatMap((record) => record.versions.map((version) => version.createdAt)),
  ].filter(Boolean)
  return times.length ? times.sort().at(-1) : null
}

// Everything a chat has to show: { messages, results, lastAt }.
export async function chatActivity({ store, dashboard }, userId, chat) {
  const messages = await getChatMessages(store, userId, chat.id)
  const results = await chatResults(dashboard, userId, chat, messages.clearedAt ?? null)
  return { messages, results, lastAt: lastAnswerAt(messages.turns, results) }
}
