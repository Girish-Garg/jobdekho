import { stripHtml } from '../html.js'
import { toIso } from '../iso-date.js'
import { postedAtFrom } from './workday-posted.js'

// The last path segment ("Senior-Engineer_JR2021723"), not the whole path:
// the segment before it is the primary location, which a recruiter can
// change without the posting becoming a different job.
export const idOf = (path) => String(path || '').split('/').filter(Boolean).pop() || ''

// Some tenants name a place by a bare city ("Noida") or an office code
// ("IND BNGL FL2-3 TWR 3" at FIS), which core's location rule cannot read as
// India. The detail's country is added to the primary place when that place
// does not name it already.
function primary(info) {
  const place = String(info?.location || '')
  const country = String(info?.country?.descriptor || '')
  if (!place || !country || place.toLowerCase().includes(country.toLowerCase())) return place
  return `${place}, ${country}`
}

// A place is already "India, Bengaluru" or "Bangalore, India", so a comma
// cannot also separate places; the slash keeps them apart.
const places = (info) => [primary(info), ...(info?.additionalLocations || [])].filter(Boolean)

// One list row plus its detail. No level is set: Workday's worker type
// ("Intern (Fixed Term)") exists only as a search facet, never on a posting,
// so the title classifier in core decides.
export function toPosting(row, info, { site, company, now }) {
  const where = places(info)
  return {
    externalId: idOf(row?.externalPath),
    title: info?.title || row?.title || '',
    company,
    location: where.length ? where.join(' / ') : row?.locationsText || '',
    url: info?.externalUrl || `${site.publicBase}${row?.externalPath || ''}`,
    description: stripHtml(info?.jobDescription || ''),
    tags: [info?.timeType].filter(Boolean),
    postedAt: toIso(info?.startDate) || postedAtFrom(row?.postedOn, now),
  }
}
