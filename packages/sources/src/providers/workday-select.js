import { idOf } from './workday-posting.js'

// Detail calls are nearly all of what a Workday board costs, so a run spends
// at most this many per company. What it cannot reach waits for the next run
// rather than going out without a body.
export const MAX_DETAILS = 40

const MULTI = /^\d+\s+locations?$/i

// The row as core would see it before its detail arrives: no body, and no
// location when the India facet already vouches for one ("3 Locations", or
// an office code such as "IND BNGL FL2-3 TWR 3", would otherwise fail core's
// location rule on text alone).
function asListed(row, company, scoped) {
  const text = String(row?.locationsText || '')
  return {
    externalId: idOf(row?.externalPath),
    title: row?.title || '',
    company,
    location: scoped || MULTI.test(text) ? '' : text,
  }
}

// The runner's context (apps/scraper/src/scrape.js) answers two questions
// cheaply: does the store already hold this posting's body, and would the
// relevance filter keep it at all. A known posting needs no second call, and
// an unwanted one is never stored, so without this check it would be fetched
// again on every run. Without a context every row is a candidate, newest
// first, up to the cap.
export function toDescribe(rows, { name, company, scoped, context }) {
  const known = context?.known
  const wanted = context?.wanted
  return rows
    .filter((row) => {
      const id = idOf(row?.externalPath)
      if (!id) return false
      if (known?.(name, id)) return false
      return !wanted || wanted(name, asListed(row, company, scoped))
    })
    .slice(0, MAX_DETAILS)
}
