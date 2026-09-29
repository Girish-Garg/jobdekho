import { stripHtml } from '../html.js'
import { internLevel } from './employment-type.js'
import { toIso } from '../iso-date.js'

// The HTML body comes first now that stripHtml keeps its structure. Ashby's
// own plain text writes every link out after its words ("Auth
// https://supabase.com/auth, written in Go https://github.com/..."), which
// the pane showed as it was and the scorer and fingerprints read as words.
// descriptionPlain stays the fallback for a board that publishes only that.
function body(j) {
  const html = j.descriptionHtml || j.description
  return html ? stripHtml(html) : String(j.descriptionPlain || '')
}

export function ashby({ slug }) {
  return {
    name: `ashby:${slug}`,
    async fetch(http) {
      const res = await http(`https://api.ashbyhq.com/posting-api/job-board/${slug}`)
      const data = await res.json()
      return (data.jobs || []).map((j) => ({
        externalId: String(j.id),
        title: j.title,
        company: slug.charAt(0).toUpperCase() + slug.slice(1),
        location: j.location || '',
        url: j.jobUrl || j.applyUrl || '',
        description: body(j),
        tags: [j.department, j.team].filter(Boolean),
        postedAt: toIso(j.publishedAt),
        ...internLevel(j.employmentType),
      }))
    },
  }
}
