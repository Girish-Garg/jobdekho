import { openStore } from '@jobdekho/store/open.js'

// The resume selection and the compiled-PDF cache are store concerns this
// feature owns alone; opening a handle here rather than growing the shared
// dashboard wrapper (apps/server/src/api/store.js, mid-edit elsewhere on
// this branch) keeps the two changes from colliding. It is safe to hold a
// second handle onto the same data directory: cachedFile (see
// packages/store/src/cached-file.js) compares size and mtime on every read,
// so whichever handle wrote last is what the other's next read sees.
let cached = null

export function resumeStore() {
  if (!cached) cached = openStore()
  return cached
}
