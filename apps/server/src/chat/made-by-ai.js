import { listAllAiResults } from '@jobdekho/store/ai-results.js'
import { allDocuments } from '@jobdekho/store/documents.js'
import { postingNames } from '@jobdekho/store/posting-lookup.js'
import { getCurrentConversation } from '@jobdekho/store/chat-history.js'
import { filedConversations } from '@jobdekho/store/chat-archive.js'

// Everything the AI made for the person, newest first, for the chat's "Made
// by AI" list: a way back to a letter, a tailoring or a check paid for weeks
// ago without remembering which job it was on or which conversation it
// came up in. Read from where each thing already lives; nothing here is
// stored twice.
//
//   { kind: 'fake-check' | 'cover-letter' | 'resume-tailor', at, postingId, job, versions }
//   { kind: 'document', at, documentId, name, documentKind, postingId, job }
//   { kind: 'profile', at, summary, conversationId, current }
//
// `job` is { title, company }, or null for a job a scrape has since dropped;
// what was made for it is still listed, since it still exists.
const MAX_ITEMS = 200
const ACTIONS = new Set(['fake-check', 'cover-letter', 'resume-tailor'])

function fromActions(records, names) {
  return records.filter((r) => ACTIONS.has(r.kind)).map((r) => ({
    kind: r.kind, at: r.createdAt, postingId: r.postingId, job: names.get(r.postingId) ?? null, versions: r.versions.length,
  }))
}

// A document the AI wrote some of: one a chat change was applied to, dated
// by the newest such change, or one made for a job from its tailoring or its
// letter (the only way a document gets a job), dated by when it was made.
function fromDocuments(docs, names) {
  return docs.flatMap((doc) => {
    const at = (doc.versions ?? []).filter((v) => v.by === 'ai').at(-1)?.at ?? (doc.postingId ? doc.createdAt : null)
    if (!at) return []
    const job = doc.postingId ? names.get(doc.postingId) ?? null : null
    return [{ kind: 'document', at, documentId: doc.id, name: doc.name, documentKind: doc.kind, postingId: doc.postingId ?? null, job }]
  })
}

// Profile changes the person applied from a chat card, with the
// conversation that offered them, so the card can be found again.
function fromProfileChanges(conversations) {
  return conversations.flatMap(({ id, current, turns }) => turns.flatMap((turn) => (turn.proposals ?? [])
    .filter((p) => p.kind === 'profile' && p.status === 'applied')
    .map((p) => ({ kind: 'profile', at: p.appliedAt ?? turn.createdAt, summary: p.summary, conversationId: id, current }))))
}

export async function madeByAi({ store, documents, userId }) {
  const [records, docs, current] = await Promise.all([
    listAllAiResults(store, userId), allDocuments(documents, userId), getCurrentConversation(store, userId),
  ])
  const names = postingNames(store, [...records.map((r) => r.postingId), ...docs.map((d) => d.postingId).filter(Boolean)])
  const conversations = [{ ...current, current: true }, ...filedConversations(store, userId).map((c) => ({ ...c, current: false }))]
  const items = [...fromActions(records, names), ...fromDocuments(docs, names), ...fromProfileChanges(conversations)]
  return items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, MAX_ITEMS)
}
