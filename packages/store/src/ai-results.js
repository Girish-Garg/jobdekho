import { toIso } from './timestamp.js'

// What an AI action answered about a posting, kept so the answer is there the
// next time the posting is opened instead of costing another call on the
// person's subscription. One record per user per (posting, action), but a
// history rather than one answer: running again or refining both cost a
// call, and both are worth keeping, so each becomes another version instead
// of replacing the one before it.
//
//   { kind, postingId, provider, createdAt, result, versions, dropped }
//
// `provider`, `createdAt` and `result` always mirror the newest entry in
// `versions`, so code that only ever knew the one-answer shape still reads
// this correctly. Each version is { instruction, provider, createdAt,
// result }; `instruction` is '' for a first run or a plain rerun, and the
// person's own words for a refine. `result` is whatever shape the action's
// parse() produced; this file does not read it. Keyed by posting then kind
// so the file stays readable by hand.
const keyOf = (postingId, kind) => `${postingId}:${kind}`

// Kept short enough that a person iterating for a while does not carry every
// attempt forever, long enough that a real back-and-forth still fits.
const MAX_VERSIONS = 10

// A record saved before versions existed has only its one answer. Reading it
// as a one-entry history is the whole of its migration: nothing is rewritten
// on disk until the next run saves a new version anyway.
function withVersions(record) {
  if (!record || record.versions) return record
  const { provider, createdAt, result } = record
  return { ...record, versions: [{ instruction: '', provider, createdAt, result }], dropped: false }
}

export async function getAiResult(store, userId, postingId, kind) {
  return withVersions(store.aiResults.get(userId)?.[keyOf(postingId, kind)] ?? null)
}

// Appends one version rather than overwriting, so the previous answer is
// still there in the chat's conversation and for the next refine to build on.
// `instruction` is '' for a first run or a plain rerun; the caller passes it
// only when this call followed the person's own words. Caps the history at
// MAX_VERSIONS, dropping the oldest; `dropped` records that this happened at
// least once, so the UI can say so without counting anything itself.
export async function setAiResult(store, userId, { postingId, kind, provider, result, instruction = '' }) {
  const mine = store.aiResults.get(userId) ?? {}
  const key = keyOf(postingId, kind)
  const existing = withVersions(mine[key])
  const createdAt = toIso(new Date())
  const grown = [...(existing?.versions ?? []), { instruction, provider, createdAt, result }]
  const dropped = Boolean(existing?.dropped) || grown.length > MAX_VERSIONS
  const versions = grown.slice(-MAX_VERSIONS)
  const record = { kind, postingId, provider, createdAt, result, versions, dropped }
  store.aiResults.set(userId, { ...mine, [key]: record })
  return record
}

export async function listAiResults(store, userId, postingId) {
  return Object.values(store.aiResults.get(userId) ?? {}).filter((r) => r.postingId === postingId).map(withVersions)
}
