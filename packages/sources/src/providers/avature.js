import { parseSite } from './avature-site.js'
import { listIndia } from './avature-list.js'
import { readDetails } from './avature-detail.js'
import { toDescribe, toPosting } from './avature-posting.js'

const PAUSE_MS = 500
const wait = () => new Promise((resolve) => setTimeout(resolve, PAUSE_MS))

// Configured as
//   { "provider": "avature", "company": "Siemens",
//     "url": "https://jobs.siemens.com/en_US/externaljobs/SearchJobs/?42386%5B0%5D=812053&listFilterMode=1" }
// where url is the portal's job list with India picked in its own country
// filter (see avature-site.js), and an optional "slug" names the source,
// avature:{slug}, defaulting to the company part of the host.
export function avature(entry = {}, { pause = wait } = {}) {
  const site = parseSite(entry.url)
  const label = entry.slug || site?.label || 'unknown'
  const name = `avature:${label}`
  const company = entry.company || label.charAt(0).toUpperCase() + label.slice(1)
  const adapter = {
    name,
    async fetch(http, context) {
      if (!site) throw new Error(`${name} has no SearchJobs page URL it can read`)
      adapter.note = undefined
      const listed = await listIndia(http, site, pause)
      const todo = toDescribe(listed.rows, { name, company, context })
      const { details, throttled } = await readDetails(http, todo, pause)
      // Every read failing is a broken source, or a portal whose pages no
      // longer look the way the parser expects; either way it is reported,
      // not returned as an empty board. A throttled portal is noted instead.
      if (todo.length && !details.size && !listed.throttled && !throttled) {
        throw new Error(`${name} listed ${todo.length} new postings but no detail could be read`)
      }
      if (listed.throttled || throttled) adapter.note = 'stopped early: the careers site answered 429'
      return todo.filter((row) => details.has(row.id)).map((row) => toPosting(row, details.get(row.id), { company }))
    },
  }
  return adapter
}
