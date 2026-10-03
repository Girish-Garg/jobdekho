import { createHash } from 'node:crypto'

// An id shaped like randomUUID()'s but always the same for the same seed.
// The move into chats (see threads-migration.js) names what it makes this
// way, so a second run, after one that failed part way or one racing it from
// the scraper's process, makes exactly the chats the first one did rather
// than a second copy of each.
export function stableId(seed) {
  const hex = createHash('sha256').update(String(seed)).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}
