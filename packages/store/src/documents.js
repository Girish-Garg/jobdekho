import { randomUUID } from 'node:crypto'
import { toIso } from './timestamp.js'
import { firstVersion, withVersion, versionAt } from './document-versions.js'

// The person's resumes and cover letters, each a LaTeX source they own:
// made from a template as a first draft, then changed by their own edits or
// by chat proposals they applied. One record per user, like every other file
// the person made (see open.js), holding
//
//   { id, name, kind, templateId, postingId, tex, versions, createdAt, updatedAt, headerKept? }
//
// `tex` always mirrors the newest version (see document-versions.js), so a
// reader that only wants the current text never walks the history.
export const DOCUMENT_KINDS = ['resume', 'cover-letter']
const MAX_NAME = 120

const all = (store, userId) => store.documents.get(userId)?.documents ?? []
const save = (store, userId, documents) => store.documents.set(userId, { documents })

const cleanName = (name, fallback) => {
  const text = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME) : ''
  return text || fallback
}

// What a list screen needs, never the bodies: a person with twenty resumes
// should not pay for twenty sources to see their names.
export const summaryOf = ({ id, name, kind, templateId, postingId, createdAt, updatedAt }) => (
  { id, name, kind, templateId, postingId, createdAt, updatedAt }
)

export async function listDocuments(store, userId) {
  return all(store, userId).map(summaryOf).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

// Every document whole, history included, for a reader that needs to know
// who wrote each version (the chat's "Made by AI" list).
export async function allDocuments(store, userId) {
  return all(store, userId)
}

export async function getDocument(store, userId, id) {
  return all(store, userId).find((doc) => doc.id === id) ?? null
}

export async function createDocument(store, userId, { name, kind, templateId = null, postingId = null, tex, by }) {
  const version = firstVersion(tex, by)
  const doc = {
    id: randomUUID(), name: cleanName(name, 'Untitled'), kind, templateId, postingId, tex,
    versions: [version], createdAt: version.at, updatedAt: version.at,
  }
  save(store, userId, [...all(store, userId), doc])
  return doc
}

// Null when there is no such document. Saving the same text again is not a
// new version, only a rename (if one was asked for), so pressing Save twice
// does not push a real version out of the twenty kept.
function change(store, userId, id, edit) {
  const docs = all(store, userId)
  const at = docs.findIndex((doc) => doc.id === id)
  if (at === -1) return null
  const next = edit(docs[at])
  save(store, userId, docs.map((doc, i) => (i === at ? next : doc)))
  return next
}

export async function saveDocumentTex(store, userId, id, { tex, name, by, restoredFrom }) {
  return change(store, userId, id, (doc) => {
    const named = { ...doc, name: name === undefined ? doc.name : cleanName(name, doc.name) }
    if (tex === doc.tex) return named.name === doc.name ? doc : { ...named, updatedAt: toIso(new Date()) }
    return withVersion(named, { tex, by, restoredFrom })
  })
}

// The header the person's profile would write, which they chose not to take
// (see the server's documents/profile-header.js), remembered so the offer
// stays away until the profile changes again. Not a version and not an
// update: the text is untouched. A falsy `rendered` forgets it.
export async function keepProfileHeader(store, userId, id, rendered) {
  return change(store, userId, id, ({ headerKept, ...doc }) => (rendered ? { ...doc, headerKept: rendered } : doc))
}

// A restore is a new version carrying the old text, never a rewind: the
// versions after it stay, so undoing a restore is one more restore.
export async function revertDocument(store, userId, id, at) {
  const version = versionAt(await getDocument(store, userId, id), at)
  if (!version) return null
  return saveDocumentTex(store, userId, id, { tex: version.tex, by: 'you', restoredFrom: at })
}

export async function deleteDocument(store, userId, id) {
  const docs = all(store, userId)
  const kept = docs.filter((doc) => doc.id !== id)
  if (kept.length === docs.length) return false
  save(store, userId, kept)
  return true
}
