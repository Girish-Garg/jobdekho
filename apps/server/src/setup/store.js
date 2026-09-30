import { openStore } from '@jobdekho/store/open.js'

// The scrape history (runs.ndjson) is the one thing the setup check reads
// that the shared dashboard wrapper (api/store.js) does not expose. A handle
// of its own, mirroring resume/store.js and documents/store.js, keeps this
// feature out of that wrapper; it only ever reads the runs file, which is
// read fresh on every call, so it cannot disagree with the scraper's
// handle. The corpus is counted through the dashboard instead, so the
// postings file is never parsed into memory a second time.
let cached = null

export function setupStore() {
  if (!cached) cached = openStore()
  return cached
}
