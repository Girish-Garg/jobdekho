import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

// Logos live in the person's own data folder, one file per address, named
// by a hash of it: the same company's logo on a hundred postings is one file.
// The extension carries the type, so serving a file needs nothing else.
export const TYPES = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif',
}
const TYPE_OF = Object.fromEntries(Object.entries(TYPES).map(([type, ext]) => [ext, type]))

// A logo that could not be fetched is tried again after a week, not on every
// view: a dead address would otherwise cost a request each time a row shows.
export const RETRY_AFTER_MS = 7 * 24 * 60 * 60 * 1000

const dirOf = (store) => join(store.dir, 'logos')
export const keyOf = (url) => createHash('sha256').update(url).digest('hex').slice(0, 24)

export function readLogo(store, url) {
  const key = keyOf(url)
  for (const [ext, type] of Object.entries(TYPE_OF)) {
    const path = join(dirOf(store), `${key}.${ext}`)
    if (existsSync(path)) return { type, body: readFileSync(path) }
  }
  return null
}

export function writeLogo(store, url, { type, body }) {
  mkdirSync(dirOf(store), { recursive: true })
  writeFileSync(join(dirOf(store), `${keyOf(url)}.${TYPES[type]}`), body)
}

// Whether a failed fetch of this address is recent enough not to repeat.
export function missedRecently(store, url, now = Date.now()) {
  const path = join(dirOf(store), `${keyOf(url)}.miss`)
  if (!existsSync(path)) return false
  const at = Number(readFileSync(path, 'utf8'))
  return Number.isFinite(at) && now - at < RETRY_AFTER_MS
}

export function writeMiss(store, url, now = Date.now()) {
  mkdirSync(dirOf(store), { recursive: true })
  writeFileSync(join(dirOf(store), `${keyOf(url)}.miss`), String(now))
}
