import { stripHtml } from '../html.js'
import { internLevel } from './employment-type.js'
import { toIso } from '../iso-date.js'

const host = (slug) => `https://${slug}.jobs.personio.de`

// search.json returns a bare array on every tenant seen so far, but the same
// board also serves wrapped shapes, so both are accepted.
function rows(data) {
  if (Array.isArray(data)) return data
  return data?.jobs || data?.positions || []
}

// Personio keeps the real body in named sections on the /xml feed. search.json
// usually returns description empty, so degree detection is weak on this
// provider until a tenant is found that populates it.
function body(j) {
  if (Array.isArray(j.jobDescriptions)) {
    return stripHtml(j.jobDescriptions.map((d) => `${d.name || ''} ${d.value || ''}`).join(' '))
  }
  return stripHtml(j.description)
}

function place(j) {
  if (j.office) return String(j.office)
  return (j.offices || []).filter(Boolean).join(', ')
}

export function personio({ slug }) {
  return {
    name: `personio:${slug}`,
    // The reply is the whole board: a posting it stops listing has closed
    // (see the scraper's closure-turn.js).
    complete: true,
    async fetch(http) {
      const res = await http(`${host(slug)}/search.json`)
      const data = await res.json()
      return rows(data).map((j) => ({
        externalId: String(j.id),
        title: j.name || j.title || '',
        company: j.subcompany || slug,
        location: place(j),
        url: `${host(slug)}/job/${j.id}`,
        description: body(j),
        tags: [j.department, j.category || j.recruitingCategory, j.schedule].filter(Boolean),
        postedAt: toIso(j.createdAt || j.created_at),
        ...internLevel(j.employment_type, j.employmentType, j.seniority),
      }))
    },
  }
}
