import { randomUUID } from 'node:crypto'
import { toIso } from './timestamp.js'
import { itemsProblem } from './chat-items.js'

// The person's chats, each owning its turns (see chat-messages.js) and the
// job results asked for in it, which carry its id (see ai-results.js). One
// record per user, { chats: [...] }, each
//
//   { id, kind, jobs: [postingId], documents: [documentId], title, createdAt, updatedAt, seenAt }
//
// `kind` is 'job', 'document', 'compare' or 'general', and what each may
// hold is in chat-items.js. A job or a document has at most one chat of its
// own. `seenAt` is when the person last looked at the chat, null before
// they ever did: an answer newer than it is one they have not seen.
export const CHAT_KINDS = ['job', 'document', 'compare', 'general']

const all = (store, userId) => store.chats.get(userId)?.chats ?? []
const save = (store, userId, chats) => store.chats.set(userId, { chats })
const newestFirst = (a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0)

export async function listChats(store, userId) {
  return [...all(store, userId)].sort(newestFirst)
}

export async function getChat(store, userId, id) {
  return all(store, userId).find((chat) => chat.id === id) ?? null
}

const homeOf = (chats, type, itemId) => chats
  .find((chat) => chat.kind === type && (type === 'job' ? chat.jobs[0] : chat.documents[0]) === itemId) ?? null

// The chat a job ('job') or a document ('document') has of its own, if it
// has one yet.
export async function homeChat(store, userId, type, itemId) {
  return homeOf(all(store, userId), type, itemId)
}

// A new chat, checked against what its kind may hold: { chat, created } or
// { error }. A job's or a document's own chat is never made twice: asking
// for one that exists answers that one, with `created` false. The look and
// the save happen with nothing awaited between them, so two first uses of
// one job arriving together cannot each make it a chat.
export async function createChat(store, userId, { kind, jobs = [], documents = [], title }, now = new Date()) {
  if (!CHAT_KINDS.includes(kind)) return { error: 'There is no such kind of chat.' }
  const problem = itemsProblem(kind, { jobs, documents })
  if (problem) return { error: problem }
  if (kind === 'job' || kind === 'document') {
    const existing = homeOf(all(store, userId), kind, kind === 'job' ? jobs[0] : documents[0])
    if (existing) return { chat: existing, created: false }
  }
  const at = toIso(now)
  const chat = { id: randomUUID(), kind, jobs: [...jobs], documents: [...documents], title, createdAt: at, updatedAt: at, seenAt: null }
  save(store, userId, [...all(store, userId), chat])
  return { chat, created: true }
}

// Merges `patch` into the chat and saves it; null when there is no such
// chat. Any change but `seenAt` moves `updatedAt`, which orders the list:
// looking at a chat is not a change to it.
export async function updateChat(store, userId, id, patch, now = new Date()) {
  const chats = all(store, userId)
  const at = chats.findIndex((chat) => chat.id === id)
  if (at === -1) return null
  const changed = Object.keys(patch).some((key) => key !== 'seenAt')
  const next = { ...chats[at], ...patch, ...(changed ? { updatedAt: toIso(now) } : {}) }
  save(store, userId, chats.map((chat, i) => (i === at ? next : chat)))
  return next
}

// Something new happened in the chat: an answer or a result landed.
export const touchChat = (store, userId, id, now = new Date()) => updateChat(store, userId, id, { updatedAt: toIso(now) }, now)

export async function deleteChat(store, userId, id) {
  const chats = all(store, userId)
  const kept = chats.filter((chat) => chat.id !== id)
  if (kept.length === chats.length) return false
  save(store, userId, kept)
  return true
}
