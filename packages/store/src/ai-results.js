import { toIso } from './timestamp.js'

// What an AI action answered about a posting, kept so the answer is there the
// next time the posting is opened instead of costing another call on the
// person's subscription. One record per user per (posting, action): a rerun
// replaces the last answer, because two verdicts on one posting is a question
// with no good display.
//
//   { kind, postingId, provider, createdAt, result }
//
// `result` is whatever shape the action's parse() produced; this file does
// not read it. Keyed by posting then kind so the file stays readable by hand.
const keyOf = (postingId, kind) => `${postingId}:${kind}`

export async function getAiResult(store, userId, postingId, kind) {
  return store.aiResults.get(userId)?.[keyOf(postingId, kind)] ?? null
}

export async function setAiResult(store, userId, { postingId, kind, provider, result }) {
  const record = { kind, postingId, provider, createdAt: toIso(new Date()), result }
  const mine = store.aiResults.get(userId) ?? {}
  store.aiResults.set(userId, { ...mine, [keyOf(postingId, kind)]: record })
  return record
}

export async function listAiResults(store, userId, postingId) {
  return Object.values(store.aiResults.get(userId) ?? {}).filter((r) => r.postingId === postingId)
}
