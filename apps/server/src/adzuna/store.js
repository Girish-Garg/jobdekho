import { openStore } from '@jobdekho/store/open.js'

// The Adzuna key file and the scrape history (runs.ndjson) are the two
// things Settings' Adzuna card reads that the shared dashboard wrapper
// (api/store.js) does not expose. A handle of its own, mirroring
// setup/store.js, keeps this feature out of that wrapper. Both files are
// re-read when they change on disk (see the store's cached-file.js and
// runs.js), so a key saved here reaches the scrape's own handle on its next
// run, and a run it records is seen here.
let cached = null

export function adzunaStore() {
  if (!cached) cached = openStore()
  return cached
}
