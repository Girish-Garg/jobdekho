import { getChat, homeChat, createChat } from '@jobdekho/store/chats.js'
import { getDocument } from '@jobdekho/store/documents.js'
import { jobTitle } from '@jobdekho/store/chat-titles.js'

// A job's or a document's own chat is made on its first message or action,
// so before that it has no id. Until then the browser names it by what it
// will be about, "job:<postingId>" or "document:<documentId>", which is also
// what its draft is kept under. Any route given such an id answers the real
// chat as soon as there is one.
const PLACEHOLDER = /^(job|document):(.+)$/s

export const NO_CHAT = 'That chat is not there any more.'

export function placeholderOf(id) {
  const match = PLACEHOLDER.exec(String(id ?? ''))
  return match ? { type: match[1], itemId: match[2] } : null
}

export const placeholderId = (type, itemId) => `${type}:${itemId}`

// The chat an id names: { chat }, or { placeholder: { type, itemId, item } }
// for a job or a document that has no chat yet, or null when there is no
// such chat, job or document. A job the corpus no longer holds still has
// its chat, if it had one; it just cannot start one.
export async function resolveChat({ store, dashboard, documents }, userId, id) {
  const wanted = placeholderOf(id)
  if (!wanted) {
    const chat = await getChat(store, userId, id)
    return chat ? { chat } : null
  }
  const existing = await homeChat(store, userId, wanted.type, wanted.itemId)
  if (existing) return { chat: existing }
  const item = wanted.type === 'job'
    ? await dashboard.getPosting(userId, wanted.itemId)
    : await getDocument(documents, userId, wanted.itemId)
  return item ? { placeholder: { ...wanted, item } } : null
}

// What a resolved chat holds: the chat itself, or what its job's or
// document's chat would hold once made.
export function shapeOf({ chat, placeholder }) {
  if (chat) return chat
  const own = (type) => (placeholder.type === type ? [placeholder.itemId] : [])
  return { kind: placeholder.type, jobs: own('job'), documents: own('document') }
}

// A job's own chat, the one it has or a new one: every action on the job
// runs there, wherever it was pressed.
export async function jobChat({ store }, userId, posting) {
  return (await createChat(store, userId, { kind: 'job', jobs: [posting.id], title: jobTitle(posting) })).chat
}

// The chat itself, made now when the id named a job's or a document's chat
// that did not exist yet.
export async function ensureChat(deps, userId, resolved) {
  if (resolved.chat) return resolved.chat
  const { type, itemId, item } = resolved.placeholder
  if (type === 'job') return jobChat(deps, userId, item)
  return (await createChat(deps.store, userId, { kind: 'document', documents: [itemId], title: item.name })).chat
}
