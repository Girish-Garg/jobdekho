import { stripHtml } from '../html.js'
import { internLevel } from './employment-type.js'
import { toIso } from '../iso-date.js'

// The list endpoint returns metadata only; SmartRecruiters serves the job ad
// body from the per-posting detail call. jobAd is mapped anyway so the body
// appears automatically if the list ever starts carrying it.
function body(j) {
  const s = j.jobAd?.sections || {}
  const parts = [s.jobDescription?.text, s.qualifications?.text, s.companyDescription?.text]
  return stripHtml(parts.filter(Boolean).join(' '))
}

// fullLocation is prebuilt by the platform and ships empty segments when a
// posting has no region, e.g. "Chennai, , India".
const clean = (s) => String(s || '').split(',').map((p) => p.trim()).filter(Boolean).join(', ')

function place(l) {
  if (!l) return ''
  const where = clean(l.fullLocation) || clean([l.city, l.region, l.country?.toUpperCase()].join(','))
  if (l.remote) return where ? `Remote - ${where}` : 'Remote'
  return where
}

// Only the first 100 postings are read. Boards larger than that need the
// offset parameter, which no configured company currently justifies.
const url = (slug) => `https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=100`

export function smartrecruiters({ slug }) {
  return {
    name: `smartrecruiters:${slug}`,
    async fetch(http) {
      const res = await http(url(slug))
      const data = await res.json()
      return (data.content || []).map((j) => ({
        externalId: String(j.id),
        title: j.name || '',
        company: j.company?.name || slug,
        location: place(j.location),
        url: `https://jobs.smartrecruiters.com/${slug}/${j.id}`,
        description: body(j),
        tags: [j.department?.label, j.function?.label, j.typeOfEmployment?.label].filter(Boolean),
        postedAt: toIso(j.releasedDate),
        ...internLevel(j.typeOfEmployment?.id, j.experienceLevel?.id),
      }))
    },
  }
}
