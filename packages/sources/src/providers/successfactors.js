import { parseSite } from './successfactors-site.js'
import { pacedGet, isThrottled } from './successfactors-get.js'
import { listIndia } from './successfactors-list.js'
import { toDescribe } from './successfactors-select.js'
import { readJobs } from './successfactors-detail.js'
import { toPosting } from './successfactors-posting.js'

// Configured as
//   { "provider": "successfactors", "url": "<careers site URL>", "company": "EY" }
// with an optional "slug" naming the source when the host's first word would
// not do, or when two sites share a host. company is spelled out because the
// host word is often not the name people know ("volvogroup", "yash").
//
// Only the classic Career Site Builder template can be read: its search and
// job pages are rendered on the server and robots.txt allows both. The
// structured routes sit under /services/ (the Unify pages' own search calls
// /services/recruiting/v1/jobs), which every CSB robots.txt checked
// disallows, so none is used; see successfactors-rows.js for what that
// means for Unify sites. sitemap.xml is allowed, but Wipro's held 5,863 job
// URLs with one shared lastmod: no date, no body, and a place only as far
// as each site spells one into its URLs.
export function successfactors(entry = {}, { pause } = {}) {
  const site = parseSite(entry.url)
  const label = entry.slug || site?.label || 'unknown'
  const name = `successfactors:${label}`
  const company = entry.company || label.charAt(0).toUpperCase() + label.slice(1)
  // Set once the host answers 429 to the first page. The runner retries a
  // source that threw, and that retry must not reach the host at all.
  let refused = null
  const adapter = {
    name,
    async fetch(http, context) {
      if (!site) throw new Error(`${name} has no Career Site Builder URL it can read`)
      if (refused) throw new Error(refused)
      adapter.note = undefined
      const get = pacedGet(http, pause)
      let listed
      try {
        listed = await listIndia(get, site)
      } catch (err) {
        if (isThrottled(err)) refused = `${name} stopped: the careers site answered 429 and will not be asked again this run`
        throw err
      }
      const todo = toDescribe(listed.rows, { name, company, context })
      const { jobs, throttled } = await readJobs(get, site, todo)
      // Every page failing is a broken source, not an empty board, so it is
      // reported as one. A throttled host is not: a retry would only be
      // refused again, so the run is noted as cut short instead.
      if (todo.length && !jobs.size && !listed.throttled && !throttled) {
        throw new Error(`${name} listed ${todo.length} new postings but no job page could be read`)
      }
      if (listed.throttled || throttled) adapter.note = 'stopped early: the careers site answered 429'
      // Only postings whose page was read are returned. One sent without it
      // would reach the store with no body, and a posting already stored is
      // skipped above, keeping its own.
      return todo.filter((row) => jobs.has(row.id)).map((row) => toPosting(row, jobs.get(row.id), { site, company }))
    },
  }
  return adapter
}
