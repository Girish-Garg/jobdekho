import { readFileSync } from 'node:fs'

// The two files that say what a scrape fetches and what it keeps:
// companies.json lists the sources, filters.json the relevance floor (see
// pipeline.js). Found from this file rather than the working directory, so
// the server, wherever it was started from, reads the very files `npm run
// scrape` does. Read on every call, so an edit to either reaches the next
// refresh without restarting the server.
const read = (name) => JSON.parse(readFileSync(new URL(`../../../config/${name}`, import.meta.url), 'utf8'))

export function readScrapeConfig() {
  return { companies: read('companies.json'), rules: read('filters.json') }
}
