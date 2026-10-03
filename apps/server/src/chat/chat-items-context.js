import { compactKey } from '@jobdekho/core/company-key.js'
import { listDocuments } from '@jobdekho/store/documents.js'
import { textChangedAt } from '@jobdekho/store/document-versions.js'
import { readDocument } from '../documents/read.js'
import { trimOpenPosting } from './postings-summary.js'
import { summarizeResults } from './results-summary.js'
import { blockedCompanies } from './blocked-names.js'
import { MAX_HISTORY } from './prompt-history.js'

// What a chat holds, as its question is asked with it on every page, read
// from the store each time: the chat names ids, never what they hold.
//
//   chatJobs       each job with the details the pane shows, the description
//                  up to its limit, and `savedAiAnswers`, the newest of each
//                  result (see results-summary.js); one the corpus no longer
//                  holds, or whose company is blocked, is { id, listed: false }
//   chatDocuments  each document with its source
//   itemNames      id to name, for labelling the history (see prompt-history.js)

// A resume or a letter is a few thousand characters. A source past this is
// shown cut, and a cut source is never changed (see document-proposal.js):
// neither a rewrite nor an edit could be checked against the whole of it.
const MAX_DOCUMENT = 40000

export function openDocument(doc) {
  const truncated = doc.tex.length > MAX_DOCUMENT
  return {
    id: doc.id, name: doc.name, kind: doc.kind, truncated, baseAt: textChangedAt(doc),
    tex: truncated ? doc.tex.slice(0, MAX_DOCUMENT) : doc.tex,
  }
}

async function chatJob(dashboard, userId, id, blocked) {
  const posting = await dashboard.getPosting(userId, id)
  if (!posting || blocked.has(compactKey(posting.company))) return { id, listed: false }
  const saved = await dashboard.listAiResults(userId, id)
  return { ...trimOpenPosting(posting), listed: !posting.closedAt, savedAiAnswers: summarizeResults(saved) }
}

// Names for the ids the recent history was asked with: the chat's own items
// first, then anything since removed from it, looked up once.
async function itemNames({ history, chatJobs, docs, dashboard, documents, userId }) {
  const names = new Map([
    ...chatJobs.filter((job) => job.company).map((job) => [job.id, job.company]),
    ...docs.map((doc) => [doc.id, doc.name]),
  ])
  const asked = history.slice(-MAX_HISTORY).flatMap((turn) => [...(turn.items?.jobs ?? []), ...(turn.items?.documents ?? [])])
  const missing = [...new Set(asked)].filter((id) => !names.has(id))
  if (!missing.length) return names
  const listed = await listDocuments(documents, userId)
  for (const id of missing) {
    const doc = listed.find((d) => d.id === id)
    const posting = doc ? null : await dashboard.getPosting(userId, id)
    const name = doc?.name ?? posting?.company
    if (name) names.set(id, name)
  }
  return names
}

// A document's chat is also shown the job its document was made for, so
// "fit this more to the job" has the job to fit it to.
export async function chatItemsContext({ chat, history = [], dashboard, documents, userId }) {
  const { keys: blocked } = await blockedCompanies(dashboard, userId)
  const docs = (await Promise.all(chat.documents.map((id) => readDocument(documents, userId, id)))).filter(Boolean)
  const madeFor = chat.kind === 'document' ? docs.map((doc) => doc.postingId).filter(Boolean) : []
  const ids = [...new Set([...chat.jobs, ...madeFor])]
  const chatJobs = await Promise.all(ids.map((id) => chatJob(dashboard, userId, id, blocked)))
  const names = await itemNames({ history, chatJobs, docs, dashboard, documents, userId })
  return { chatJobs, chatDocuments: docs.map(openDocument), itemNames: names }
}
