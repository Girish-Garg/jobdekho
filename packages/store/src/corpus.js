import { retagged } from '@jobdekho/core/retag.js'
import { cachedFile } from './cached-file.js'
import { parseNdjson, toNdjson } from './ndjson.js'

// The corpus is disposable: a scrape can rebuild it and every write replaces
// it whole, which is why it lives alone in its own file, apart from anything
// the user typed. In memory it is a Map by posting id and the same rows as an
// array, so a lookup and a scan each have the shape they want without the
// feed spreading a Map on every request.
//
// A load or a save builds a NEW array and Map rather than mutating the old
// ones. Anything derived from the corpus (the fit's features, skill rarity
// and per-profile context in fit-inputs.js) is cached against that identity,
// so it is invalidated
// the moment the corpus changes, by construction rather than by a clock.
function indexed(rows) {
  const byId = new Map(rows.map((row) => [row.id, row]))
  return { rows: [...byId.values()], byId }
}

// Rows tagged under an older version of the rules are tagged again as they
// load, once, from the text they kept (see core's retag.js), the way the
// fit's features are read again (corpus-features.js); the next write keeps
// them. Not written back here: a scrape in another process may be writing
// the same file, and its write already carries the new tags. retagged is
// called with the row alone, since map would pass its index on as a model.
export function openCorpus(path) {
  const file = cachedFile(path, {
    parse: (text) => indexed(parseNdjson(text).map((row) => retagged(row))),
    serialize: (loaded) => toNdjson(loaded.rows),
    empty: () => indexed([]),
  })
  return {
    path,
    rows: () => file.read().rows,
    byId: () => file.read().byId,
    save(rowsById) {
      file.write(indexed([...rowsById.values()]))
    },
  }
}
