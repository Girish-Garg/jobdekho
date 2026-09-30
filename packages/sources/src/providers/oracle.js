import { loadSite } from './oracle-site.js'
import { isThrottled } from './oracle-api.js'
import { listIndia } from './oracle-list.js'
import { toDescribe } from './oracle-select.js'
import { readDetails } from './oracle-detail.js'
import { idOf, toPosting } from './oracle-posting.js'

const PAUSE_MS = 250
const wait = () => new Promise((resolve) => setTimeout(resolve, PAUSE_MS))

const slugOf = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

function pageUrlOf(url) {
  try {
    const u = new URL(String(url || ''))
    return /^https?:$/.test(u.protocol) ? u.href : null
  } catch {
    return null
  }
}

// Configured as
//   { "provider": "oracle", "url": "<careers site URL>", "company": "Texas Instruments", "slug": "ti" }
// The source is named oracle:{slug}. The name is part of every posting's id,
// so config pins it with a slug rather than leaning on company, which may be
// reworded. Without one it falls back to company: the Oracle host ("edbz",
// "fa-ewjt-saasfaprod1") names a data centre pod, not a company, and neither
// it nor the site number ("CX_1" at most companies) tells two boards apart.
export function oracle(entry = {}, { pause = wait } = {}) {
  const label = entry.slug || slugOf(entry.company) || 'unknown'
  const name = `oracle:${label}`
  const company = entry.company || label
  const pageUrl = pageUrlOf(entry.url)
  let refused = null
  const adapter = {
    name,
    async fetch(http, context) {
      if (!pageUrl) throw new Error(`${name} has no careers site URL it can read`)
      // The runner retries a source that threw. After a 429 that retry would
      // only be refused again, so it is answered here without a request.
      if (refused) throw new Error(refused)
      adapter.note = undefined
      let site
      let listed
      try {
        site = await loadSite(http, pageUrl)
        listed = await listIndia(http, site, pause)
      } catch (err) {
        if (isThrottled(err)) {
          refused = `stopped: the careers site answered 429 (${err.message})`
          adapter.note = refused
        }
        throw err
      }
      if (!listed.india) {
        adapter.note = 'the careers site knows no India location'
        return []
      }
      const todo = toDescribe(listed.rows, { name, company, context })
      const { details, throttled } = await readDetails(http, site, todo, pause)
      // Every read failing is a broken source, not an empty board, so it is
      // reported as one. A throttled host is not: a retry would only be
      // refused again, so the run is noted as cut short instead.
      if (todo.length && !details.size && !listed.throttled && !throttled) {
        throw new Error(`${name} listed ${todo.length} new postings but no detail could be read`)
      }
      if (listed.throttled || throttled) adapter.note = 'stopped early: the careers site answered 429'
      // Only postings with their detail are returned: one without it would be
      // stored with no body, and a posting already stored is skipped above,
      // keeping its own.
      return todo
        .filter((row) => details.has(idOf(row)))
        .map((row) => toPosting(row, details.get(idOf(row)), { site, company }))
    },
  }
  return adapter
}
