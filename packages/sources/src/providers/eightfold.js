import { parseSite } from './eightfold-site.js'
import { listIndia } from './eightfold-list.js'
import { readDetails } from './eightfold-detail.js'
import { toDescribe, toPosting } from './eightfold-posting.js'

const PAUSE_MS = 400
const wait = () => new Promise((resolve) => setTimeout(resolve, PAUSE_MS))

// Configured as
//   { "provider": "eightfold", "url": "https://careers.qualcomm.com/careers",
//     "domain": "qualcomm.com", "company": "Qualcomm" }
// with an optional "slug" to name the source, eightfold:{slug}, defaulting to
// the domain's first label. company is spelt out because the payload never
// names the employer, and "mlp" is Millennium.
export function eightfold(entry = {}, { pause = wait } = {}) {
  const site = parseSite(entry.url, entry.domain)
  const label = entry.slug || String(entry.domain || '').split('.')[0] || 'unknown'
  const name = `eightfold:${label}`
  const company = entry.company || label.charAt(0).toUpperCase() + label.slice(1)
  const adapter = {
    name,
    async fetch(http, context) {
      if (!site) throw new Error(`${name} needs a careers site URL and the domain its pages name`)
      adapter.note = undefined
      const listed = await listIndia(http, site, pause)
      const todo = toDescribe(listed.rows, { name, company, context })
      const { details, throttled } = await readDetails(http, site, listed.api, todo, pause)
      // Every read failing is a broken source, not an empty board. A throttled
      // host is not: a retry would only be refused again, so the run is noted
      // as cut short instead.
      if (todo.length && !details.size && !listed.throttled && !throttled) {
        throw new Error(`${name} listed ${todo.length} new postings but no detail could be read`)
      }
      if (listed.throttled || throttled) adapter.note = 'stopped early: the careers site answered 429'
      // Only postings with their detail are returned, so none reaches the
      // store without a body; one already stored was skipped above and keeps
      // its own.
      return todo.filter((row) => details.has(row.id)).map((row) => toPosting(row, details.get(row.id), { company }))
    },
  }
  return adapter
}
