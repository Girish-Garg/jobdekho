import { companyKey } from '@jobdekho/core/company-key.js'
import { feedMatches } from './dashboard.js'

// Every company with at least one posting, once each, so the chat can spot a
// company a question names (see apps/server/src/chat/question-search.js).
// Read off the in-memory corpus on each call: scanning a few thousand rows
// costs less than a cache that has to be kept in step with every scrape.
export function listCompanies(store) {
  const names = new Set()
  for (const { company } of store.corpus.rows()) if (company) names.add(company)
  return [...names]
}

// Mixed case reads as a name; SHOUTING is usually an acronym ("CRED") and
// lowercase a slug ("meesho"), so they come after it, in that order.
const caseRank = (name) => (name === name.toUpperCase() ? 1 : name === name.toLowerCase() ? 0 : 2)
const bySpelling = ([a, x], [b, y]) => caseRank(b) - caseRank(a) || y - x || a.length - b.length

// The spelling each employer is shown under, from the whole corpus rather
// than the filtered rows, so a ticked company keeps its name whatever else is
// picked: the best-cased one, then the commonest, then the shortest
// ("Playsimple Games" over "PlaySimple Games Private Limited").
function displayNames(store) {
  const spellings = new Map()
  for (const { company } of store.corpus.rows()) {
    const key = companyKey(company)
    if (!key) continue
    const seen = spellings.get(key) ?? spellings.set(key, new Map()).get(key)
    seen.set(company, (seen.get(company) ?? 0) + 1)
  }
  return new Map([...spellings].map(([key, seen]) => [key, [...seen].sort(bySpelling)[0][0]]))
}

// The company menu's list: every employer in what the feed would show under
// all the other filters, with how many jobs picking it brings up. Scored only
// under a fit floor, the one filter that needs a score; otherwise scoring the
// corpus would be work thrown away. `picked` is the picks an entry stands
// for, in the spelling they were made in (a pane's "PHONEPE LIMITED", the
// menu's "Phonepe"), so the menu ticks it and unticks exactly those. A pick
// with no jobs under the other filters keeps its entry, at nought, or it
// could not be unticked there.
export function listCompanyCounts(store, userId, opts = {}) {
  const names = displayNames(store)
  const scoring = opts.minFit ? opts.profile : null
  const { rows } = feedMatches(store, userId, { ...opts, companies: undefined, profile: scoring })
  const entries = new Map()
  const entry = (key, fallback) => entries.get(key)
    ?? entries.set(key, { name: names.get(key) ?? fallback, count: 0, picked: [] }).get(key)
  for (const row of rows) {
    const key = companyKey(row.company)
    if (key) entry(key, row.company).count += 1
  }
  for (const pick of opts.companies ?? []) {
    const key = companyKey(pick)
    if (key) entry(key, pick).picked.push(pick)
  }
  return [...entries.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}
