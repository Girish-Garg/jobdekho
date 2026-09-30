import { placeName } from './successfactors-place.js'

// Job pages are nearly all of what a board costs, so a run fetches at most
// this many per board. What it cannot reach waits for the next run rather
// than going out without a body.
export const MAX_DETAILS = 40

// The row as core would see it before its page is read: no body, and the
// listed place with India's code written out, so core's location rule reads
// "Pune, MH, IN, 411014" as India rather than as no place it knows.
const asListed = (row, company) => ({
  externalId: row.id,
  title: row.title,
  company,
  location: placeName(row.location),
})

// The runner's context (apps/scraper/src/scrape.js) answers two questions
// cheaply: does the store already hold this posting's body, and would the
// relevance filter keep it at all. A known posting needs no page, and an
// unwanted one is never stored, so without this check its page would be
// fetched again on every run. Without a context every row is a candidate,
// newest first, up to the cap.
export function toDescribe(rows, { name, company, context }) {
  const known = context?.known
  const wanted = context?.wanted
  return rows
    .filter((row) => {
      if (!row?.id) return false
      if (known?.(name, row.id)) return false
      return !wanted || wanted(name, asListed(row, company))
    })
    .slice(0, MAX_DETAILS)
}
