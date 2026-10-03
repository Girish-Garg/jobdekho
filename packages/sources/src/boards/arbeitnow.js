import { stripHtml } from '../html.js'
import { toIso } from '../iso-date.js'
import { internLevel, jobType } from '../providers/employment-type.js'

// Public JSON, no key. Heavily European, so most rows are dropped downstream by
// the location rule. Kept because its worldwide-remote listings are real and it
// costs one request.
const URL = 'https://www.arbeitnow.com/api/job-board-api'

// tags and job_types are lists until they are not: one row in a live fetch
// carried job_types as {"1": "professional / experienced"}. PHP's json_encode
// emits an object whenever an array's keys are not 0..n, so a single dropped
// index changes the type of the field. Spreading that threw, and because the
// adapter maps every row in one pass, one malformed row cost all 175.
const list = (value) => (Array.isArray(value) ? value : Object.values(value || {}))

export function toRaw(j) {
  const jobTypes = list(j.job_types)
  return {
    externalId: j.slug || '',
    title: j.title || '',
    company: j.company_name || '',
    // Left exactly as given. Tagging a Berlin role as remote would sneak it past
    // the location rule, and it is not reachable from India in practice.
    location: j.location || '',
    url: j.url || '',
    description: stripHtml(j.description || ''),
    tags: [...list(j.tags), ...jobTypes],
    // created_at is epoch SECONDS here, unlike the millis toIso expects, so an
    // unscaled value silently dates every posting to 1970.
    postedAt: toIso(j.created_at ? j.created_at * 1000 : null),
    ...internLevel(...jobTypes),
    ...jobType(...jobTypes),
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
