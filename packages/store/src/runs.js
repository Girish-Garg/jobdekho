import { existsSync, readFileSync } from 'node:fs'
import { writeAtomic } from './atomic-write.js'
import { parseNdjson } from './ndjson.js'

// One line per scrape. Appended by reading the file back and rewriting it
// whole: a plain append is one syscall, but a crash inside it can leave half
// a line, and at a few hundred bytes a day the atomic rewrite costs nothing
// measurable while keeping the one rule every write in this store follows.
export function openRuns(path) {
  const text = () => (existsSync(path) ? readFileSync(path, 'utf8') : '')
  return {
    path,
    append(run) {
      writeAtomic(path, `${text()}${JSON.stringify(run)}\n`)
    },
    all: () => parseNdjson(text()),
  }
}
