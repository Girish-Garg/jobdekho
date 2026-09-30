import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

// The resume PDF exactly as the person uploaded it, kept beside the compiled
// ones (resumes/<user>/, see cache.js). Apply assist attaches it to an
// application when there is no LaTeX-made PDF to give. JobDekho used to keep
// only the text of an upload, so a resume uploaded before this was added has
// to be uploaded once more to be attachable.
export const originalPath = (store, userId) => join(store.dir, 'resumes', userId, 'original-resume.pdf')

export function saveOriginal(store, userId, bytes) {
  const path = originalPath(store, userId)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, bytes)
}

// Deleting the profile deletes this with it: it is the same resume.
export function deleteOriginal(store, userId) {
  rmSync(originalPath(store, userId), { force: true })
}

export function findOriginal(store, userId) {
  const path = originalPath(store, userId)
  return existsSync(path) ? path : null
}
