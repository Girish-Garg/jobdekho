// Detail calls are nearly all of what a portal costs, so a run spends at
// most this many per company; the rest wait for the next run rather than
// going out without a body.
export const MAX_DETAILS = 40

// The row as core would see it before its page is read. The list is India
// already, by the filter in the configured URL, so a row the card gives no
// place for is shown with none, which the relevance filter reads as no
// objection; one that names a place elsewhere is dropped before it costs a
// request.
const asListed = (row, company) => ({ externalId: row.id, title: row.title, company, location: row.location })

// The runner's context (apps/scraper/src/scrape.js): `known` says the store
// already holds a posting's body, so it needs no second call and is left out
// of the run; `wanted` runs the relevance filter, and a posting it would drop
// is never stored, so it would otherwise be fetched again on every run.
// Without a context every row is a candidate, newest first, up to the cap.
export function toDescribe(rows, { name, company, context }) {
  const known = context?.known
  const wanted = context?.wanted
  return rows
    .filter((row) => !known?.(name, row.id) && (!wanted || wanted(name, asListed(row, company))))
    .slice(0, MAX_DETAILS)
}

// One listed row plus its page. The title is the list's: a posting's page
// often heads itself with the company name or "Job details". No level is
// set; Avature's experience pickers ("Early Professional") are recruiter
// choices, so the title classifier in core decides.
export function toPosting(row, info, { company }) {
  return {
    externalId: row.id,
    title: row.title,
    company,
    location: info.location || row.location,
    url: row.url,
    description: info.description,
    tags: [info.workMode].filter(Boolean),
    postedAt: info.postedAt || row.postedAt,
  }
}
