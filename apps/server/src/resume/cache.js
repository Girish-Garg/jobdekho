import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

// The compiled PDF is a pure function of the rendered .tex: hashing it is
// the whole cache key, so any change to the profile, the template or the
// selection produces a different key and a fresh compile, while reopening
// the same resume unchanged serves the file already on disk instead of
// paying for pdflatex again. Short enough to stay a readable filename.
export function cacheKey(templateId, tex) {
  const digest = createHash('sha256').update(tex).digest('hex').slice(0, 24)
  return `${templateId}-${digest}`
}

// Kept in the person's own store directory (see packages/store/src/open.js),
// under a subdirectory per user, the same way the store keeps every other
// per-person file apart from the corpus.
const userDir = (store, userId) => join(store.dir, 'resumes', userId)

export function readCachedPdf(store, userId, key) {
  const path = join(userDir(store, userId), `${key}.pdf`)
  return existsSync(path) ? readFileSync(path) : null
}

export function writeCachedPdf(store, userId, key, pdf) {
  const dir = userDir(store, userId)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${key}.pdf`), pdf)
}
