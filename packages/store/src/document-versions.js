import { toIso } from './timestamp.js'

// A document's history, newest last: { tex, at, by } where `by` says who
// wrote that text ('template' for a first draft, 'ai' for a chat proposal
// the person applied, 'you' for their own edit or a restore). Kept short
// enough that a document edited all afternoon does not carry every keystroke
// save forever, long enough to walk back a change the person regrets.
export const MAX_VERSIONS = 20
export const AUTHORS = ['template', 'ai', 'you']

// `at` is what a restore names a version by, so two saves inside the same
// millisecond must not share one: the second is nudged a millisecond past
// the first, which keeps the list ordered and every `at` unique.
function nextAt(versions, now) {
  const last = versions.at(-1)?.at
  if (!last || now > last) return now
  return toIso(Date.parse(last) + 1)
}

export function firstVersion(tex, by, now = toIso(new Date())) {
  return { tex, at: now, by }
}

// The document with `tex` as its newest version. `restoredFrom` marks a
// version that brought back an older one, so a history screen can say so
// instead of showing an unexplained copy.
export function withVersion(doc, { tex, by, restoredFrom }) {
  const at = nextAt(doc.versions ?? [], toIso(new Date()))
  const version = { tex, at, by, ...(restoredFrom ? { restoredFrom } : {}) }
  const versions = [...(doc.versions ?? []), version].slice(-MAX_VERSIONS)
  return { ...doc, tex, versions, updatedAt: at }
}

export const versionAt = (doc, at) => (doc?.versions ?? []).find((version) => version.at === at) ?? null

// The moment the text last changed, which a chat proposal records so it can
// tell, when the person presses Apply, whether the text it rewrote is still
// the text in the document. A rename moves updatedAt but not this.
export const textChangedAt = (doc) => doc?.versions?.at(-1)?.at ?? doc?.createdAt ?? null
