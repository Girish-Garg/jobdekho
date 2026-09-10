import { skillRegex } from '@jobdekho/core/fit-dimensions.js'

// How many stored postings mention each profile skill, plus the corpus size,
// for core's idfWeights(). Rarity is measured with the same notion of
// "mentions" that scoring pays out on: the same core-built pattern, over the
// title and the same body fallback skillFit() reads, so a skill can never be
// rare by one definition and matched by another.
//
// 214ms for 25 skills over the corpus is not a cost a feed page can carry,
// so the answer is cached per skill set. WHAT INVALIDATES IT: the cache is
// keyed on the loaded corpus array itself, not on the store or a clock. A
// scrape's rewrite and a reload after another process changed the file both
// hand out a new array (see corpus.js), so every entry computed against the
// old one becomes unreachable at that moment, and the old array is collected
// with its entries. Within one loaded corpus the counts cannot change, so
// there is no TTL to get wrong in either direction.
const EMPTY = { docFreq: {}, totalDocs: 0 }
const caches = new WeakMap()

export function skillDocFreq(store, skills) {
  if (!skills.length) return EMPTY
  const rows = store.corpus.rows()
  if (!caches.has(rows)) caches.set(rows, new Map())
  const cache = caches.get(rows)
  const key = [...skills].sort().join('\n')
  if (!cache.has(key)) cache.set(key, count(rows, skills))
  return cache.get(key)
}

function count(rows, skills) {
  const patterns = skills.map((skill) => [skill, skillRegex(skill)])
  const docFreq = Object.fromEntries(skills.map((skill) => [skill, 0]))
  for (const row of rows) {
    // Lowercased because skillFit() lowercases before matching and the
    // patterns carry no case flag; counting case-sensitively would call a
    // skill rare whenever the ads write it in capitals.
    const hay = `${row.title || ''}\n${row.descriptionText || row.descriptionSnippet || ''}`.toLowerCase()
    for (const [skill, pattern] of patterns) if (pattern.test(hay)) docFreq[skill] += 1
  }
  return { docFreq, totalDocs: rows.length }
}
