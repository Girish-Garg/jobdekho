import { buildAdapters } from '@jobdekho/sources/registry.js'
import { adzuna } from '@jobdekho/sources/boards/adzuna.js'

// The sources a run fetches: every one config/companies.json lists, and
// Adzuna whenever there is a key for it (from Settings or the environment,
// see the store's adzuna-keys.js), so turning Adzuna on never means editing
// that file. Without a key it stays out, rather than logging a failed source
// on every run for something the person never asked for.
//
// An "adzuna" entry already in the file, from before Settings could hold a
// key, gives way to this one rather than running beside it: two would spend
// the free tier's requests twice over for the same postings.
const isAdzuna = (adapter) => adapter.name.startsWith('adzuna:')

export function scrapeAdapters(companies, keys, { build = buildAdapters } = {}) {
  const listed = build(companies)
  if (!keys) return listed
  const { appId, appKey } = keys
  return [...listed.filter((adapter) => !isAdzuna(adapter)), adzuna({ keys: { appId, appKey } })]
}
