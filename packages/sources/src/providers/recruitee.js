import { stripHtml } from '../html.js'
import { internLevel, jobType } from './employment-type.js'
import { toIso } from '../iso-date.js'

function place(j) {
  const where = j.location || [j.city, j.country].filter(Boolean).join(', ')
  if (j.remote) return where ? `Remote - ${where}` : 'Remote'
  return where
}

// education_code arrives as "bachelor_degree". The degree classifier matches on
// word boundaries, so the underscore has to go or the requirement is invisible.
function body(j) {
  const education = String(j.education_code || '').replace(/_/g, ' ')
  return stripHtml([j.description, j.requirements, education].filter(Boolean).join(' '))
}

export function recruitee({ slug }) {
  return {
    name: `recruitee:${slug}`,
    // The reply is the whole board: a posting it stops listing has closed
    // (see the scraper's closure-turn.js).
    complete: true,
    async fetch(http) {
      const res = await http(`https://${slug}.recruitee.com/api/offers/`)
      const data = await res.json()
      return (data.offers || []).map((j) => ({
        externalId: String(j.id),
        title: j.title || '',
        company: j.company_name || slug,
        location: place(j),
        url: j.careers_url || j.careers_apply_url || '',
        description: body(j),
        tags: [j.department, j.category_code, ...(j.tags || [])].filter(Boolean),
        postedAt: toIso(j.published_at || j.created_at),
        ...internLevel(j.employment_type_code, j.experience_code),
        ...jobType(j.employment_type_code),
      }))
    },
  }
}
