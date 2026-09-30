import { stripHtml } from '../html.js'
import { toIso } from '../iso-date.js'
import { PAGES, PER_PAGE, WHAT, searchUrl } from './adzuna-url.js'

// Adzuna is a licensed aggregator with a public API. It indexes Indian job
// boards that have no API of their own, which is the supported way to reach
// that inventory: signing into those sites and scraping them is against their
// terms and gets the account banned.
//
// The key is the person's own free one (https://developer.adzuna.com). The
// scrape passes it in, from Settings or the environment (see the store's
// adzuna-keys.js, and the scraper's sources.js, which adds this adapter
// whenever a key exists). Built with none, as an "adzuna" entry in
// config/companies.json would be, it reads ADZUNA_APP_ID and ADZUNA_APP_KEY
// itself, and without them reports itself unconfigured rather than failing
// the run.
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

const fromEnv = () => ({ appId: process.env.ADZUNA_APP_ID, appKey: process.env.ADZUNA_APP_KEY })

export function adzuna({ country = 'in', what = WHAT, keys = null } = {}) {
  return {
    name: `adzuna:${country}`,
    async fetch(http) {
      const { appId, appKey } = keys ?? fromEnv()
      if (!appId || !appKey) throw new Error('No Adzuna key: add one in Settings, or set ADZUNA_APP_ID and ADZUNA_APP_KEY')
      const out = []
      for (let page = 1; page <= PAGES; page++) {
        let results
        try {
          const res = await http(searchUrl({ country, page, what, appId, appKey }))
          results = (await res.json())?.results || []
        } catch (err) {
          // A first page that fails is a bad key or no network, and has to
          // show as this source failing, not as a board with no jobs. A later
          // one keeps the pages that did come back.
          if (page === 1) throw err
          break
        }
        out.push(...results.map(toRaw))
        // A short page is the last one: asking for the next would spend one
        // of the free tier's requests on an empty answer.
        if (results.length < PER_PAGE) break
      }
      return out
    },
  }
}
