import { sql } from 'drizzle-orm'
import { skillPatternSource } from '@jobdekho/core/fit-dimensions.js'
import { postings } from './schema.js'

// How many stored postings mention each profile skill, plus the corpus size,
// for core's idfWeights(). One scan answers for every skill at once: a
// filtered count per skill beats a query per skill, and the filter uses the
// same core-built pattern the scorer binds, so rarity is measured with the
// same notion of "mentions" that scoring pays out on.

// A feed request would otherwise pay a full-table scan every time, for a
// corpus that changes once a day. Keyed per db handle so tests with fake
// connections never see each other's entries.
const TTL_MS = 10 * 60 * 1000
const EMPTY = { docFreq: {}, totalDocs: 0 }
const caches = new WeakMap()

function cacheFor(db) {
  if (!caches.has(db)) caches.set(db, new Map())
  return caches.get(db)
}

// Core falls back to the snippet when the full text was never stored, so the
// frequency count has to read the same fallback or rarity would be measured
// against a different body than the one scoring matches.
const matchable = (pattern) => sql`${postings.title} ~* ${pattern}
  or coalesce(${postings.descriptionText}, ${postings.descriptionSnippet}) ~* ${pattern}`

export async function skillDocFreq(db, skills) {
  if (!skills.length) return EMPTY
  const cache = cacheFor(db)
  const key = [...skills].sort().join('\n')
  const hit = cache.get(key)
  const now = Date.now()
  if (hit && now - hit.at < TTL_MS) return hit.value
  for (const [k, entry] of cache) if (now - entry.at >= TTL_MS) cache.delete(k)
  try {
    const columns = { total: sql`count(*)` }
    skills.forEach((skill, i) => {
      const pattern = skillPatternSource(skill, '\\y', '\\y')
      columns[`df${i}`] = sql`count(*) filter (where ${matchable(pattern)})`
    })
    const [row] = await db.select(columns).from(postings)
    const value = {
      docFreq: Object.fromEntries(skills.map((skill, i) => [skill, Number(row[`df${i}`])])),
      totalDocs: Number(row.total),
    }
    cache.set(key, { at: now, value })
    return value
  } catch {
    // Rarity is a refinement, not a requirement: an unweighted feed is a far
    // better failure than a 500. Not cached, so the next request retries.
    return EMPTY
  }
}
