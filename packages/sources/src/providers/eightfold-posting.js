import { stripHtml } from '../html.js'
import { internLevel, jobType } from './employment-type.js'

// Detail calls are nearly all of what a board costs, so a run spends at most
// this many per company; the rest wait for the next run rather than going
// out without a body.
export const MAX_DETAILS = 40

// A place is "Pune, Maharashtra, India", so a comma cannot also separate
// places; the slash keeps them apart, as it does for Workday.
const joined = (places) => places.join(' / ')

// Unlike Workday's "3 Locations", an Eightfold list row names every place,
// so the relevance filter sees the real location before any detail is read,
// and a remote role elsewhere that the search let in is dropped there.
const asListed = (row, company) => ({ externalId: row.id, title: row.title, company, location: joined(row.places) })

// The runner's context (apps/scraper/src/scrape.js): `known` says the store
// already holds a posting's body, so it needs no second call and is left out
// of the run; `wanted` runs the relevance filter, and a posting it would drop
// is never stored, so it would otherwise be fetched again on every run.
// Without a context every row is a candidate, newest first, up to the cap.
export function toDescribe(rows, { name, company, context }) {
  const known = context?.known
  const wanted = context?.wanted
  return rows
    .filter((row) => row.id && !known?.(name, row.id) && (!wanted || wanted(name, asListed(row, company))))
    .slice(0, MAX_DETAILS)
}

// One listed row plus its detail. level is set only from an employment type
// the tenant states outright; seniority pickers are left to the title.
export function toPosting(row, info, { company }) {
  const places = info?.places?.length ? info.places : row.places
  return {
    externalId: row.id,
    title: info?.title || row.title,
    company,
    location: joined(places),
    url: info?.url || row.url,
    description: stripHtml(info?.body || ''),
    tags: [row.department, row.workMode].filter(Boolean),
    postedAt: row.postedAt,
    ...internLevel(...(info?.employmentType || [])),
    ...jobType(...(info?.employmentType || [])),
  }
}
