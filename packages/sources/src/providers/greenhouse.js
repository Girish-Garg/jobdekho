import { stripHtml } from '../html.js'
import { toIso } from '../iso-date.js'

// content=true is required: with content=false every posting arrives with an
// empty body and the degree classifier has nothing to read.
const url = (slug) => `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`

export function greenhouse({ slug }) {
  return {
    name: `greenhouse:${slug}`,
    async fetch(http) {
      const res = await http(url(slug))
      const data = await res.json()
      return (data.jobs || []).map((j) => ({
        externalId: String(j.id),
        title: j.title,
        company: slug.charAt(0).toUpperCase() + slug.slice(1),
        location: j.location?.name || '',
        url: j.absolute_url,
        description: stripHtml(j.content || ''),
        tags: (j.departments || []).map((d) => d.name),
        postedAt: toIso(j.updated_at),
      }))
    },
  }
}
