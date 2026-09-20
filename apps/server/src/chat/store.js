import { openStore } from '@jobdekho/store/open.js'

// A separate handle onto the same data directory, mirroring
// apps/server/src/resume/store.js: growing the shared dashboard wrapper
// (apps/server/src/api/store.js) risks colliding with whatever else is
// touching it right now, and cachedFile means two handles on one file agree
// on whichever wrote last (see packages/store/src/cached-file.js), so a
// second handle here is safe.
let cached = null

export function chatStore() {
  if (!cached) cached = openStore()
  return cached
}
