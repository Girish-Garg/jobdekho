import { stripHtml } from '../html.js'
import { toIso } from '../iso-date.js'

// The requisition number ("25017908"): what the posting's own page and the
// detail call are both addressed by.
export const idOf = (row) => String(row?.Id ?? '').trim()

// Oracle names a place from the country down ("Bengaluru, Karnataka, India")
// and a posting can have several. A place that is only the tail of another
// ("India" beside "Bengaluru, Karnataka, India") says nothing more and is
// dropped. A comma already sits inside every place, so a slash separates them.
export function placesOf(item) {
  const all = [item?.PrimaryLocation, ...(item?.secondaryLocations || []).map((s) => s?.Name)]
    .map((p) => String(p || '').trim())
    .filter(Boolean)
  const unique = [...new Set(all)]
  return unique.filter((p) => !unique.some((q) => q !== p && q.endsWith(`, ${p}`))).join(' / ')
}

// Oracle's own codes, not the label, which each company rewords ("Hybrid/Club"
// at Icertis, "Work From Home" at EXL). core's work mode reads the tag.
const WORKPLACE = { ORA_REMOTE: 'Remote', ORA_HYBRID: 'Hybrid', ORA_ON_SITE: 'On-site' }
// The code is the site's own: only the table's keys count, not the names
// every plain object answers to.
const workplaceOf = (code) => (Object.hasOwn(WORKPLACE, code ?? '') ? WORKPLACE[code] : null)

// The body is the posting's own three sections. The corporate and legal
// blocks beside them are left out: they are the same text on every posting a
// company has, which would crowd the 4000 characters the scorer reads and
// make unrelated postings look alike to the content fingerprint.
function body(info) {
  return [info?.ExternalDescriptionStr, info?.ExternalResponsibilitiesStr, info?.ExternalQualificationsStr]
    .map((part) => stripHtml(part || ''))
    .filter(Boolean)
    .join('\n\n')
}

// One listed row plus its detail. No level is set: the worker and contract
// type fields were empty on every posting sampled, and RequisitionType is a
// company's own wording ("Professional" on a Trainee role), so the title
// classifier in core decides.
export function toPosting(row, info, { site, company }) {
  const id = idOf(row)
  return {
    externalId: id,
    title: info?.Title || row?.Title || '',
    company,
    location: placesOf(info?.PrimaryLocation ? info : row),
    url: `${site.publicBase}/job/${encodeURIComponent(id)}`,
    description: body(info),
    tags: [workplaceOf(info?.WorkplaceTypeCode || row?.WorkplaceTypeCode), info?.JobSchedule].filter(Boolean),
    postedAt: toIso(info?.ExternalPostedStartDate) || toIso(row?.PostedDate),
  }
}
