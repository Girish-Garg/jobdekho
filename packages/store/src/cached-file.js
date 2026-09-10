import { readFileSync, statSync } from 'node:fs'
import { writeAtomic } from './atomic-write.js'

// A file parsed once and held in memory, re-read only when it changes on
// disk. The server keeps the corpus loaded because parsing it costs 40ms and
// a feed page cannot pay that on every request, but the scraper is a separate
// process that rewrites the same file once a day, and a server that never
// looked again would serve yesterday's corpus until someone restarted it. A
// stat per read costs microseconds and notices the swap the moment the
// scraper's rename lands. Size and mtime together stand in for the content:
// a rewrite that changes neither is not one this tool can produce.
const MISSING = 'missing'

function signatureOf(path) {
  try {
    const s = statSync(path)
    return `${s.size}:${s.mtimeMs}`
  } catch (err) {
    if (err.code === 'ENOENT') return MISSING
    throw err
  }
}

export function cachedFile(path, { parse, serialize, empty }) {
  let loadedAs = null
  let value

  return {
    path,
    read() {
      const current = signatureOf(path)
      if (current !== loadedAs) {
        value = current === MISSING ? empty() : parse(readFileSync(path, 'utf8'))
        loadedAs = current
      }
      return value
    },
    // What was just written is what is in memory, so the parse is skipped;
    // the signature is still taken from disk because that is the only
    // version of the truth a later read() will be compared against.
    write(next) {
      writeAtomic(path, serialize(next))
      value = next
      loadedAs = signatureOf(path)
    },
  }
}
