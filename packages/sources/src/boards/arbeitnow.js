import { stripHtml } from '../html.js'
import { toIso } from '../iso-date.js'
import { internLevel } from '../providers/employment-type.js'

// Public JSON, no key. Heavily European, so most rows are dropped downstream by
// the location rule. Kept because its worldwide-remote listings are real and it
// costs one request.
const URL = 'https://www.arbeitnow.com/api/job-board-api'

export function toRaw(j) {
  return {
    externalId: j.slug || '',
    title: j.title || '',
    company: j.company_name || '',
    // Left exactly as given. Tagging a Berlin role as remote would sneak it past
    // the location rule, and it is not reachable from India in practice.
    location: j.location || '',
    url: j.url || '',
    description: stripHtml(j.description || ''),
    tags: [...(j.tags || []), ...(j.job_types || [])],
    // created_at is epoch SECONDS here, unlike the millis toIso expects, so an
    // unscaled value silently dates every posting to 1970.
    postedAt: toIso(j.created_at ? j.created_at * 1000 : null),
    ...internLevel(...(j.job_types || [])),
  }
}

export function arbeitnow() {
  return {
    name: 'arbeitnow',
    async fetch(http) {
      const res = await http(URL)
      return ((await res.json()).data || []).map(toRaw)
    },
  }
}
