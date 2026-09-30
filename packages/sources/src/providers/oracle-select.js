import { idOf, placesOf } from './oracle-posting.js'

// Detail calls are nearly all of what an Oracle board costs, so a run spends
// at most this many per board. What it cannot reach waits for the next run
// rather than going out without a body.
export const MAX_DETAILS = 40

// The row as core would see it before its detail arrives: no body yet. Unlike
// Workday's "3 Locations", Oracle's list already names every place down to
// the country, so the filter judges the real location.
const asListed = (row, company) => ({ externalId: idOf(row), title: row?.Title || '', company, location: placesOf(row) })

// The runner's context (apps/scraper/src/scrape.js) answers two questions
// cheaply: does the store already hold this posting's body, and would the
// relevance filter keep it at all. A known posting needs no second call, and
// an unwanted one is never stored, so without this check it would be fetched
// again on every run. Without a context every row is a candidate, newest
// first, up to the cap. A row seen twice (a new posting shifts the pages
// while they are read) is described once.
export function toDescribe(rows, { name, company, context }) {
  const known = context?.known
  const wanted = context?.wanted
  const seen = new Set()
  return rows
    .filter((row) => {
      const id = idOf(row)
      if (!id || seen.has(id)) return false
      seen.add(id)
      if (known?.(name, id)) return false
      return !wanted || wanted(name, asListed(row, company))
    })
    .slice(0, MAX_DETAILS)
}
