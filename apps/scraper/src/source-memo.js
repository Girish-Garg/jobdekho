import { createHash } from 'node:crypto'

// What a source remembers from one run to the next (source-memo.json in the
// data folder, one record for the computer): a board's ETag, a Workday
// tenant's India facets and how many postings it listed. Read once when a run
// starts; what a run learns is staged, and written only after the run's
// corpus write succeeded, and only for sources that came through: an ETag
// kept for a reply that never reached the store would hide that reply's
// postings on every run after.
//
// A change to the relevance rules (config/filters.json) voids all of it. A
// board that answers "unchanged" is not read again, so postings the new rules
// would keep could never arrive while it stayed unchanged.
const rulesHash = (rules) => createHash('sha1').update(JSON.stringify(rules ?? {})).digest('hex').slice(0, 16)

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export function openMemo(db, rules) {
  const hash = rulesHash(rules)
  const file = db.sourceMemo.get()
  const saved = isRecord(file) && file.rules === hash && isRecord(file.sources) ? file.sources : {}
  const staged = {}
  return {
    recall: (source, key) => staged[source]?.[key] ?? saved[source]?.[key] ?? null,
    keep(source, key, value) {
      staged[source] = { ...staged[source], [key]: value }
    },
    // `okSources` are the names of sources whose result was ok. `settle(source,
    // key, value)` may finish a value now that the write is in (the ETag's
    // count of stored postings); it returns the value to keep.
    commit(okSources, settle = (source, key, value) => value) {
      const sources = { ...saved }
      for (const [source, values] of Object.entries(staged)) {
        if (!okSources.has(source)) continue
        const done = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, settle(source, key, value)]))
        sources[source] = { ...sources[source], ...done }
      }
      db.sourceMemo.set({ rules: hash, sources })
    },
  }
}
