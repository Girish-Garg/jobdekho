import { stripHtml } from '../html.js'
import { toIso } from '../iso-date.js'

const URL = 'https://remoteok.com/api'

// Amounts under a thousand dollars a year are placeholders, which rounded
// to "$0k - $0k /year" and read as unpaid.
function salary(j) {
  const real = (n) => (Number(n) >= 1000 ? Number(n) : 0)
  const lo = real(j.salary_min)
  const hi = real(j.salary_max)
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
    // Every listing on this board is remote; its location says where from.
    workMode: 'remote',
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
