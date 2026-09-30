import { stripHtml } from '../html.js'
import { toIso } from '../iso-date.js'
import { placeName } from './successfactors-place.js'

// A list row's date is the site's display format ("Sep 30, 2026"), read as
// midnight UTC so it lands on the same day as the page's datePosted. A
// format Date.parse cannot read ("30/09/2026") gives null, not a guess.
const listedAt = (text) => (text ? toIso(`${text} UTC`) : null)

// A place already reads "Bangalore, KA, India", so a comma cannot also
// separate places; the slash keeps them apart, as in the Workday provider.
//
// No level is set: Career Site Builder has no employment type common to
// every site (each picks its own custom fields), so the title classifier in
// core decides. No tags either: the extra list column is a business
// function at Asian Paints and a date at YASH, and a function such as
// "Sales & Marketing" would read as a title word to core's exclude
// keywords, dropping an engineering role filed under it.
export function toPosting(row, job, { site, company }) {
  const places = job?.places?.length ? job.places : [placeName(row?.location)].filter(Boolean)
  return {
    externalId: row?.id || '',
    title: job?.title || row?.title || '',
    company,
    location: places.join(' / '),
    url: site.jobUrl(row?.href || ''),
    description: stripHtml(job?.description || ''),
    tags: [],
    postedAt: toIso(job?.datePosted) || listedAt(String(row?.date || '').trim()),
  }
}
