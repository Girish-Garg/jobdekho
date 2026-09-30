import { stripHtml } from '../html.js'
import { toIso } from '../iso-date.js'
import { fetchUnlessUnchanged } from '../conditional.js'

// content=true is required: with content=false every posting arrives with an
// empty body and the degree classifier has nothing to read.
const url = (slug) => `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`

// A board's slug is not its name ("razorpaysoftwareprivatelimited",
// "arcesiumllc"), so a config entry may give `company`; without one the slug,
// capitalised, is all Greenhouse's job list offers.
//
// The reply is the whole board, so the adapter is `complete`: a posting it
// stops listing has closed (see the scraper's closure-turn.js). A board that
// has not changed since the last read answers 304 and costs nothing.
export function greenhouse({ slug, company }) {
  const named = company || slug.charAt(0).toUpperCase() + slug.slice(1)
  const name = `greenhouse:${slug}`
  return {
    name,
    complete: true,
    async fetch(http, context) {
      const res = await fetchUnlessUnchanged(http, context, name, url(slug))
      if (!res) return []
      const data = await res.json()
      return (data.jobs || []).map((j) => ({
        externalId: String(j.id),
        title: j.title,
        company: named,
        location: j.location?.name || '',
        url: j.absolute_url,
        description: stripHtml(j.content || ''),
        tags: (j.departments || []).map((d) => d.name),
        // updated_at moves every time a recruiter edits the posting, which
        // made "Newest posted" show stale roles that got a typo fix as new.
        // first_published is the real publish date; it is missing on some
        // older boards, so updated_at is still the fallback.
        postedAt: toIso(j.first_published || j.updated_at),
        // The board's own closing date, when it set one.
        closesAt: toIso(j.application_deadline),
      }))
    },
  }
}
