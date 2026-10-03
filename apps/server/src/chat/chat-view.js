import { compactKey } from '@jobdekho/core/company-key.js'
import { listDocuments } from '@jobdekho/store/documents.js'
import { jobTitle } from '@jobdekho/store/chat-titles.js'
import { busyCall, failuresOf } from './in-flight.js'
import { followUpsOf } from './follow-ups.js'
import { blockedCompanies } from './blocked-names.js'
import { placeholderId } from './chat-lookup.js'
import { chatActivity } from './chat-results.js'

// A chat as the browser shows it, in the switcher's list and over its own
// messages:
//
//   { id, kind, title, jobs: [{ id, title, company, listed }],
//     documents: [{ id, name, kind, exists }], createdAt, updatedAt, seenAt,
//     listed, unseen, busy, waiting, failed, placeholder }
//
// A job's chat is named for its job and a document's for its document as
// they are now, the stored title standing in once they are gone. `listed`
// is false for a job's chat whose job JobDekho no longer lists (closed,
// pruned or blocked): it still opens, marked "No longer listed". `unseen`
// says an answer landed after the person last looked; `busy`, `waiting` and
// `failed` that its call is running, that a follow-up waits, or that its
// last call failed (see GET /api/chats/pending for each one's detail).

// Every name and state one request shows, read once: a list of fifty chats
// would otherwise read the corpus fifty times.
export async function viewKit(deps, userId, jobIds) {
  const [cards, docs, blocked] = await Promise.all([
    postingCards(deps.dashboard, userId, [...new Set(jobIds)]), listDocuments(deps.documents, userId), blockedCompanies(deps.dashboard, userId),
  ])
  const job = (id) => {
    const card = cards.get(id)
    if (!card) return { id, title: null, company: null, listed: false }
    return { id, title: card.title, company: card.company, listed: !card.closed && !blocked.keys.has(compactKey(card.company)) }
  }
  const document = (id) => {
    const doc = docs.find((d) => d.id === id)
    return doc ? { id, name: doc.name, kind: doc.kind, exists: true } : { id, name: null, kind: null, exists: false }
  }
  return { job, document, busy: busyCall(userId), waiting: followUpsOf(userId), failed: failuresOf(userId) }
}

// The dashboard's own cheap lookup (see api/store.js), else one posting at a
// time, which is all a dashboard from before it (only seen in tests) has.
async function postingCards(dashboard, userId, ids) {
  if (typeof dashboard.postingCards === 'function') return dashboard.postingCards(userId, ids)
  const rows = await Promise.all(ids.map((id) => dashboard.getPosting(userId, id)))
  return new Map(rows.filter(Boolean).map((row) => [row.id, { title: row.title, company: row.company, closed: Boolean(row.closedAt) }]))
}

function liveTitle(chat, jobs, documents) {
  if (chat.kind === 'job' && jobs[0]?.title) return jobTitle(jobs[0])
  if (chat.kind === 'document' && documents[0]?.exists) return documents[0].name
  return chat.title
}

export function chatView(chat, kit, lastAt = null) {
  const jobs = chat.jobs.map(kit.job)
  const documents = chat.documents.map(kit.document)
  return {
    id: chat.id, kind: chat.kind, title: liveTitle(chat, jobs, documents), jobs, documents,
    createdAt: chat.createdAt, updatedAt: chat.updatedAt, seenAt: chat.seenAt,
    listed: chat.kind !== 'job' || jobs[0].listed,
    unseen: Boolean(lastAt && (!chat.seenAt || lastAt > chat.seenAt)),
    busy: kit.busy?.chatId === chat.id, waiting: Boolean(kit.waiting[chat.id]), failed: Boolean(kit.failed[chat.id]),
    placeholder: false,
  }
}

// A job's or a document's chat before it exists: empty, under the id it is
// asked for by (see chat-lookup.js).
export function placeholderView({ type, itemId }, kit) {
  const own = (wanted) => (type === wanted ? [itemId] : [])
  const chat = { id: placeholderId(type, itemId), kind: type, jobs: own('job'), documents: own('document'), title: '', createdAt: null, updatedAt: null, seenAt: null }
  return { ...chatView(chat, kit), placeholder: true }
}

// What the browser opens a chat with: { chat, turns, dropped, results },
// where `dropped` says older messages were removed.
export async function chatPage(deps, userId, resolved) {
  if (resolved.placeholder) {
    const kit = await viewKit(deps, userId, resolved.placeholder.type === 'job' ? [resolved.placeholder.itemId] : [])
    return { chat: placeholderView(resolved.placeholder, kit), turns: [], dropped: false, results: [] }
  }
  const { chat } = resolved
  const [kit, { messages, results, lastAt }] = await Promise.all([viewKit(deps, userId, chat.jobs), chatActivity(deps, userId, chat)])
  return { chat: chatView(chat, kit, lastAt), turns: messages.turns, dropped: messages.dropped, results }
}

export const viewOf = async (deps, userId, chat) => (await chatPage(deps, userId, { chat })).chat
