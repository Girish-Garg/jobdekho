// What each kind of chat may hold, as [fewest, most] of each type:
//
//   job       its one home job, and up to 3 documents
//   document  its home document and up to 2 more, and up to 5 jobs
//   compare   2 to 5 jobs, and up to 3 documents
//   general   no jobs, and up to 3 documents
//
// Kept to what a person compares at once and what a prompt can carry whole:
// every job's description and every document's source go in with each
// question (see apps/server/src/chat/thread-context.js).
export const ITEM_LIMITS = {
  job: { jobs: [1, 1], documents: [0, 3] },
  document: { jobs: [0, 5], documents: [1, 3] },
  compare: { jobs: [2, 5], documents: [0, 3] },
  general: { jobs: [0, 0], documents: [0, 3] },
}

export const ITEM_TYPES = { job: 'jobs', document: 'documents' }

const OUT_OF_BOUNDS = {
  'job.jobs': 'A job\'s chat is about its own job alone. Adding another job starts a comparison.',
  'job.documents': 'A job\'s chat holds up to 3 documents.',
  'document.jobs': 'A document\'s chat holds up to 5 jobs.',
  'document.documents': 'A document\'s chat holds its own document and up to 2 more.',
  'compare.jobs': 'A comparison holds two to five jobs.',
  'compare.documents': 'A comparison holds up to 3 documents.',
  'general.jobs': 'A general chat holds no jobs. Compare jobs in a chat of their own.',
  'general.documents': 'A general chat holds up to 3 documents.',
}

// The sentence saying why these lists do not fit a chat of this kind, or
// null when they do.
export function itemsProblem(kind, { jobs = [], documents = [] }) {
  const limits = ITEM_LIMITS[kind]
  if (!limits) return 'There is no such kind of chat.'
  for (const [type, list] of [['jobs', jobs], ['documents', documents]]) {
    if (new Set(list).size !== list.length) return `A chat holds each of its ${type} once.`
    const [fewest, most] = limits[type]
    if (list.length < fewest || list.length > most) return OUT_OF_BOUNDS[`${kind}.${type}`]
  }
  return null
}

// The item a chat is about and cannot lose: a job chat's job, a document
// chat's first document. A comparison and a general chat have none.
export function homeItem(chat) {
  if (chat.kind === 'job') return { type: 'job', id: chat.jobs[0] }
  if (chat.kind === 'document') return { type: 'document', id: chat.documents[0] }
  return null
}

// The chat's lists with one item added or removed: { jobs, documents }, or
// { error } saying why not. Adding what is already there, or removing what
// is not, changes nothing, so a repeated click is harmless. The type is the
// request's own word, so only ITEM_TYPES' own keys count: "constructor" is
// a key every plain object has.
export function withItem(chat, { action, type, id }) {
  const key = Object.hasOwn(ITEM_TYPES, type) ? ITEM_TYPES[type] : null
  if (!key || typeof id !== 'string' || !id) return { error: 'Say which job or document to add or remove.' }
  const lists = { jobs: [...chat.jobs], documents: [...chat.documents] }
  const has = lists[key].includes(id)
  if (action === 'add') {
    if (!has) lists[key].push(id)
  } else if (action === 'remove') {
    const home = homeItem(chat)
    if (home?.type === type && home.id === id) return { error: `The chat's own ${type} stays in it.` }
    lists[key] = lists[key].filter((item) => item !== id)
  } else {
    return { error: 'Say whether to add or remove it.' }
  }
  const problem = itemsProblem(chat.kind, lists)
  return problem ? { error: problem } : lists
}
