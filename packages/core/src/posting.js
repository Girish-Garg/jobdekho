import { createHash } from 'node:crypto'

export function makeId(source, externalId) {
  return createHash('sha1').update(`${source}:${externalId}`).digest('hex').slice(0, 16)
}
