import { stripHtml } from '../html.js'
import { internLevel } from './employment-type.js'
import { toIso } from '../iso-date.js'

// details=true is what fills description in. Without it the widget returns
// titles only and the degree classifier has nothing to read.
const url = (slug) => `https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`

function place(j) {
  const l = (j.locations || [])[0] || {}
  const parts = [j.city || l.city, j.state || l.region, j.country || l.country]
  const where = [...new Set(parts.filter(Boolean))].join(', ')
  if (j.telecommuting) return where ? `Remote - ${where}` : 'Remote'
  return where
}

// education is a separate enum field ("Bachelor's Degree"). Folding it into the
// body is what lets the degree classifier see it at all.
function body(j) {
  const parts = [j.description, j.requirements, j.benefits, j.education]
  return stripHtml(parts.filter(Boolean).join(' '))
}

export function workable({ slug }) {
  return {
    name: `workable:${slug}`,
    // The reply is the whole board: a posting it stops listing has closed
    // (see the scraper's closure-turn.js).
    complete: true,
    async fetch(http) {
      const res = await http(url(slug))
      const data = await res.json()
      const company = data.name || slug
      return (data.jobs || []).map((j) => ({
        externalId: String(j.shortcode || j.id || ''),
        title: j.title || '',
        company,
        location: place(j),
        url: j.url || j.shortlink || j.application_url || '',
        description: body(j),
        tags: [j.department, j.function, j.employment_type].filter(Boolean),
        postedAt: toIso(j.published_on || j.created_at),
        ...internLevel(j.employment_type, j.experience),
      }))
    },
  }
}
