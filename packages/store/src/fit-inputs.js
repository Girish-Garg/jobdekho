import { featuresOf, FEATURES_VERSION } from '@jobdekho/core/posting-features.js'
import { skillRarity } from '@jobdekho/core/skill-rarity.js'
import { fitContext } from '@jobdekho/core/fit-context.js'

// What scoring the feed needs besides the rows, worked out once and kept for
// as long as the loaded corpus stays the same array: each row's features
// (read now only for a row stored before features existed), the rarity of
// every skill across the corpus, and the person's side of the fit per
// profile version. A scrape's rewrite or a reload hands out a new array
// (see corpus.js), so everything computed against the old one becomes
// unreachable at that moment and is collected with it: no clock to get
// wrong in either direction.
const caches = new WeakMap()

function cacheFor(rows) {
  if (!caches.has(rows)) caches.set(rows, { features: new Map(), rarity: null, contexts: new Map() })
  return caches.get(rows)
}

export function featuresFor(rows, row) {
  if (row.features?.v === FEATURES_VERSION) return row.features
  const cache = cacheFor(rows).features
  if (!cache.has(row.id)) cache.set(row.id, featuresOf(row))
  return cache.get(row.id)
}

// Only the fields the fit reads make the key, so saving an unrelated part of
// the profile (a headline, a project) does not rebuild anything.
const profileKey = (p) => JSON.stringify([p?.skills, p?.titles, p?.years, p?.degree, p?.locations])

// A handful of profile versions per corpus is plenty: the person edits one
// profile, and an old version is only ever asked for again by a stale tab.
const MAX_CONTEXTS = 8

export function fitContextFor(store, profile) {
  const rows = store.corpus.rows()
  const cache = cacheFor(rows)
  if (!cache.rarity) cache.rarity = skillRarity(rows.map((row) => featuresFor(rows, row)))
  const key = profileKey(profile)
  if (!cache.contexts.has(key)) {
    if (cache.contexts.size >= MAX_CONTEXTS) cache.contexts.delete(cache.contexts.keys().next().value)
    cache.contexts.set(key, fitContext(profile, cache.rarity))
  }
  return cache.contexts.get(key)
}
