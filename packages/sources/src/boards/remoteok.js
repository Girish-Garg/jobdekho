import { stripHtml } from '../html.js'
import { toIso } from '../iso-date.js'

const URL = 'https://remoteok.com/api'

function salary(j) {
  const lo = j.salary_min
  const hi = j.salary_max
  if (!lo && !hi) return null
  const fmt = (n) => `$${Math.round(n / 1000)}k`
  return lo && hi && lo !== hi ? `${fmt(lo)} - ${fmt(hi)} /year` : fmt(lo || hi) + ' /year'
}

export function toRaw(j) {
  return {
    externalId: String(j.id),
    title: j.position || '',
    company: j.company || '',
    location: j.location || 'Remote',
    url: j.apply_url || j.url || '',
    description: stripHtml(j.description || ''),
    tags: j.tags || [],
    postedAt: toIso(j.date),
    stipend: salary(j),
  }
}

// The first element of the response is a legal notice object, not a job. It has
// no id, so filtering on that is more robust than dropping index 0 blindly.
export function parseRemoteOk(payload) {
  return (Array.isArray(payload) ? payload : []).filter((j) => j && j.id).map(toRaw)
}

export function remoteok() {
  return {
    name: 'remoteok',
    async fetch(http) {
      const res = await http(URL)
      return parseRemoteOk(await res.json())
    },
  }
}
