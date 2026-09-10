import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { openStore } from './open.js'
import { parseNdjson } from './ndjson.js'
import { fromPgRow } from './pg-row.js'

// node packages/store/src/import-pg.js <postings-export.ndjson> [data-dir]
//
// The one-time move off Postgres: a row-per-line export of the postings
// table, with the schema's column names, becomes the corpus. It replaces the
// corpus rather than merging into it because an export is the whole table and
// the point is to arrive with exactly what was there. Nothing the user made
// by hand is touched: those files are not the corpus.
export function importPgExport(store, text) {
  const rows = parseNdjson(text).map(fromPgRow)
  store.corpus.save(new Map(rows.map((row) => [row.id, row])))
  return rows.length
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file, dir] = process.argv.slice(2)
  if (!file) {
    console.error('usage: node packages/store/src/import-pg.js <export.ndjson> [data-dir]')
    process.exit(2)
  }
  const store = openStore(dir)
  const count = importPgExport(store, readFileSync(file, 'utf8'))
  console.log(`Imported ${count} posting(s) into ${store.corpus.path}`)
}
