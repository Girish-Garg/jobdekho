import { FEATURES_VERSION, featuresOf } from '@jobdekho/core/posting-features.js'

// Gives every stored row the fit's features at the current version, as part
// of the one write a scrape makes. New and refreshed rows already carry them
// from the full description (see normalize.js). The rest are rows stored
// before features existed, rows under an older version, and rows no source
// sends in full again (the list-then-describe adapters skip what the store
// already holds): those are read from the text they kept, once, so the feed
// never has to. A no-op after the first run.
export function withFeatures(rowsById) {
  for (const [id, row] of rowsById) {
    if (row.features?.v === FEATURES_VERSION) continue
    rowsById.set(id, { ...row, features: featuresOf(row) })
  }
}
