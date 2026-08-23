import { stripHtml } from '../html.js'
import { toIso } from '../iso-date.js'
import { internLevel } from '../providers/employment-type.js'

// Public JSON, no key. Remote-only inventory, which suits the filter: it keeps
// genuinely global-remote roles and drops the ones locked to a foreign region.
const CATEGORIES = ['software-dev', 'data', 'devops']
const LIMIT = 100
const url = (category) => `https://remotive.com/api/remote-jobs?category=${category}&limit=${LIMIT}`

export function toRaw(j) {
  return {
    externalId: String(j.id),
    title: j.title || '',
    company: j.company_name || '',
    // "Worldwide", "India", "USA Only". The core filter reads this to decide
    // whether an applicant in India can actually apply.
    location: j.candidate_required_location || 'Remote',
    url: j.url || '',
    description: stripHtml(j.description || ''),
    tags: j.tags || [],
    postedAt: toIso(j.publication_date),
    stipend: j.salary || null,
    ...internLevel(j.job_type),
  }
}

export function remotive() {
  return {
    name: 'remotive',
    async fetch(http) {
      const out = []
      for (const category of CATEGORIES) {
        try {
          const res = await http(url(category))
          out.push(...((await res.json()).jobs || []).map(toRaw))
        } catch {
          // A failed category should not lose the ones that worked.
        }
      }
      return out
    },
  }
}
