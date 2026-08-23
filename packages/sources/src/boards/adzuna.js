import { stripHtml } from '../html.js'
import { toIso } from '../iso-date.js'

// Adzuna is a licensed aggregator with a public API. It indexes Indian job
// boards that have no API of their own, which is the supported way to reach
// that inventory: signing into those sites and scraping them is against their
// terms and gets the account banned.
//
// Credentials come from ADZUNA_APP_ID and ADZUNA_APP_KEY. Register a free app
// at https://developer.adzuna.com. Without them the adapter reports itself as
// unconfigured rather than failing the run.
const PAGES = 3
const PER_PAGE = 50

const url = (country, page, what, id, key) =>
  `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}` +
  `?app_id=${id}&app_key=${key}&results_per_page=${PER_PAGE}` +
  `&what=${encodeURIComponent(what)}&content-type=application/json`

function salary(j) {
  const lo = j.salary_min ? Math.round(j.salary_min) : null
  const hi = j.salary_max ? Math.round(j.salary_max) : null
  if (!lo && !hi) return null
  if (lo && hi && lo !== hi) return `${lo.toLocaleString('en-IN')} - ${hi.toLocaleString('en-IN')} /year`
  return `${(lo || hi).toLocaleString('en-IN')} /year`
}

export function toRaw(j) {
  return {
    externalId: String(j.id),
    title: j.title || '',
    company: j.company?.display_name || '',
    location: j.location?.display_name || '',
    url: j.redirect_url || '',
    description: stripHtml(j.description || ''),
    tags: (j.category?.label ? [j.category.label] : []),
    postedAt: toIso(j.created),
    stipend: salary(j),
  }
}

export function adzuna({ country = 'in', what = 'software developer' } = {}) {
  return {
    name: `adzuna:${country}`,
    async fetch(http) {
      const id = process.env.ADZUNA_APP_ID
      const key = process.env.ADZUNA_APP_KEY
      if (!id || !key) throw new Error('ADZUNA_APP_ID and ADZUNA_APP_KEY are not set')
      const out = []
      for (let page = 1; page <= PAGES; page++) {
        try {
          const res = await http(url(country, page, what, id, key))
          const data = await res.json()
          out.push(...(data.results || []).map(toRaw))
        } catch {
          // One bad page should not lose the pages that did come back.
        }
      }
      return out
    },
  }
}
