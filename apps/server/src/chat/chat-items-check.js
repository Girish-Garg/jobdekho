import { listChats, createChat } from '@jobdekho/store/chats.js'
import { getDocument } from '@jobdekho/store/documents.js'
import { getChatMessages } from '@jobdekho/store/chat-messages.js'
import { compareTitle } from '@jobdekho/store/chat-titles.js'
import { busyCall, failuresOf } from './in-flight.js'
import { followUpsOf } from './follow-ups.js'

export const NO_POSTING = 'no such posting'
export const NO_DOCUMENT = 'That document is not there any more.'

// The first job or document named that the person does not have, as the
// sentence its 404 carries, or null when every one is there: a chat only
// ever gains what exists when it is added.
export async function missingItem({ dashboard, documents }, userId, { jobs = [], documents: docs = [] }) {
  for (const id of jobs) if (!(await dashboard.getPosting(userId, id))) return NO_POSTING
  for (const id of docs) if (!(await getDocument(documents, userId, id))) return NO_DOCUMENT
  return null
}

// The companies a comparison is named for, in its order (see the store's
// chat-titles.js).
export async function companiesOf({ dashboard }, userId, jobIds) {
  const postings = await Promise.all(jobIds.map((id) => dashboard.getPosting(userId, id)))
  return postings.map((posting) => posting?.company ?? null)
}

const sameItems = (a, b) => a.length === b.length && a.every((id) => b.includes(id))

// A chat of this kind holding exactly these items that nothing was ever
// asked in and nothing waits on. Making another would only leave an empty
// twin behind, which the list never shows, so "New chat" pressed twice, or
// the same comparison started twice, opens the one already made. One whose
// first question is running, waiting or failed is not empty: it has that
// question to show.
export async function emptyTwin(deps, userId, { kind, jobs = [], documents = [] }) {
  const busy = busyCall(userId)
  const waiting = followUpsOf(userId)
  const failed = failuresOf(userId)
  for (const chat of await listChats(deps.store, userId)) {
    if (chat.kind !== kind || !sameItems(chat.jobs, jobs) || !sameItems(chat.documents, documents)) continue
    if (busy?.chatId === chat.id || waiting[chat.id] || failed[chat.id]) continue
    if (!(await getChatMessages(deps.store, userId, chat.id)).turns.length) return chat
  }
  return null
}

// A comparison of these jobs, { chat, created }: the empty one already
// there, or a new one named for their companies.
export async function openCompare(deps, userId, jobs, documents = []) {
  const twin = await emptyTwin(deps, userId, { kind: 'compare', jobs, documents })
  if (twin) return { chat: twin, created: false }
  const title = compareTitle(await companiesOf(deps, userId, jobs))
  return createChat(deps.store, userId, { kind: 'compare', jobs, documents, title })
}
