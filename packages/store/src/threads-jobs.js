import { toIso } from './timestamp.js'
import { withVersions } from './ai-results.js'
import { jobTitle } from './chat-titles.js'
import { stableId } from './stable-id.js'

// Saved job results from before chats owned their state (see
// threads-migration.js). Every posting with a result that no chat holds yet
// gets its job chat, the one it already has when there is one, since a job
// has at most one, and each such version takes that chat's id. A version
// that already names a chat keeps it.
const needsChat = (version) => !version?.chatId
const versionsOf = (record) => (Array.isArray(record?.versions) ? record.versions : [record])

// Whether ai-results.json, as read from disk, holds any result that names
// no chat. A file that does not parse is left for the store's own reads to
// report: the move into chats has nothing to say about it.
export function resultsWithoutChat(bytes) {
  if (bytes === null) return false
  try {
    return Object.values(JSON.parse(bytes.toString('utf8')) ?? {}).some((mine) => Object.values(mine ?? {})
      .some((record) => record?.postingId && versionsOf(record).some(needsChat)))
  } catch {
    return false
  }
}

function waitingTimes(entries, now) {
  const times = new Map()
  for (const [, record] of entries) {
    if (!record?.postingId || !Array.isArray(record.versions)) continue
    for (const version of record.versions.filter(needsChat)) {
      times.set(record.postingId, [...(times.get(record.postingId) ?? []), toIso(version.createdAt) ?? now])
    }
  }
  return times
}

// The job chat each waiting posting's results go to, as a Map from posting
// id to chat id, with the chats that had to be made for it. A new chat is
// dated by the results in it and seen as of the newest: the person saw each
// one when it came.
function chatsFor(userId, times, { chats, postingOf }) {
  const chatOf = new Map()
  const made = []
  for (const [postingId, list] of times) {
    const existing = chats.find((chat) => chat.kind === 'job' && chat.jobs[0] === postingId)
    if (existing) {
      chatOf.set(postingId, existing.id)
      continue
    }
    const [first, last] = [[...list].sort()[0], [...list].sort().at(-1)]
    const chat = {
      id: stableId(`job:${userId}:${postingId}`), kind: 'job', jobs: [postingId], documents: [],
      title: jobTitle(postingOf(postingId)), createdAt: first, updatedAt: last, seenAt: last,
    }
    made.push(chat)
    chatOf.set(postingId, chat.id)
  }
  return { chatOf, made }
}

// One person's results record, every version given its chat, and the job
// chats made for them: { results, chats }. The newest version's chat is
// mirrored on its record, as ai-results.js keeps it.
export function jobChatsOf(userId, results, { chats = [], postingOf = () => null, now }) {
  const entries = Object.entries(results ?? {}).map(([key, raw]) => [key, withVersions(raw)])
  const { chatOf, made } = chatsFor(userId, waitingTimes(entries, now), { chats, postingOf })
  const out = {}
  for (const [key, record] of entries) {
    const chatId = record?.postingId ? chatOf.get(record.postingId) : null
    if (!chatId) {
      out[key] = results[key]
      continue
    }
    const versions = record.versions.map((version) => (needsChat(version) ? { ...version, chatId } : version))
    out[key] = { ...record, versions, chatId: versions.at(-1)?.chatId ?? chatId }
  }
  return { results: out, chats: made }
}
