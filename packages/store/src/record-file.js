import { cachedFile } from './cached-file.js'

// One JSON object for the whole data folder, for what belongs to this
// computer rather than to a person: LinkedIn's guard, whose limits are on
// the address the requests come from, whoever made them. The CLI and the
// server both read and write it, which is why it goes through cachedFile
// like the user files, and why each write replaces it whole.
//
// A file that no longer parses (an edit by hand) reads as none rather than
// failing every scrape until someone finds it; the next write replaces it.
function parseOrNull(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export function recordFile(path) {
  const file = cachedFile(path, {
    parse: parseOrNull,
    serialize: (record) => `${JSON.stringify(record, null, 2)}\n`,
    empty: () => null,
  })
  return {
    path,
    get: () => file.read(),
    set: (record) => file.write(record),
  }
}
