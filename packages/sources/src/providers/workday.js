import { parseSite } from './workday-site.js'
import { listIndia } from './workday-list.js'
import { toDescribe } from './workday-select.js'
import { readDetails } from './workday-detail.js'
import { toPosting, idOf } from './workday-posting.js'
import { recallWorkday, keepWorkday } from './workday-memo.js'
import { hostKey } from '../host-gate.js'

const PAUSE_MS = 250
const wait = () => new Promise((resolve) => setTimeout(resolve, PAUSE_MS))

// Configured as
//   { "provider": "workday", "url": "<careers site URL>", "company": "NVIDIA" }
// with an optional "slug" to name a second site on a tenant already listed.
// company is spelled out because the tenant is often an abbreviation ("wf"
// is Wells Fargo) and the payload only names a legal entity ("IN01 NVIDIA
// Graphics Bengaluru").
//
// `hostKey` names the data centre the tenant lives on, so the run spreads its
// Workday tenants across data centres (the scraper's interleave.js).
export function workday(entry = {}, { pause = wait, now, clock = Date.now } = {}) {
  const site = parseSite(entry.url)
  const label = entry.slug || site?.tenant || 'unknown'
  const name = `workday:${label}`
  const company = entry.company || label.charAt(0).toUpperCase() + label.slice(1)
  const adapter = {
    name,
    hostKey: site ? hostKey(site.listUrl) : undefined,
    async fetch(http, context) {
      if (!site) throw new Error(`${name} has no careers site URL it can read`)
      adapter.note = undefined
      const nowMs = clock()
      const memo = recallWorkday(context, name, nowMs)
      const isKnown = (row) => Boolean(context?.known?.(name, idOf(row?.externalPath)))
      const listed = await listIndia(http, site, pause, { memo, isKnown })
      // Nothing came or went since the last full read: every posting it
      // listed is still listed, and there is nothing new to describe.
      if (listed.quiet) {
        context?.unchanged?.(name, memo.fullAt)
        return []
      }
      const todo = toDescribe(listed.rows, { name, company, scoped: listed.scoped, context })
      const { details, throttled } = await readDetails(http, site, todo, pause)
      // Every read failing is a broken source, not an empty board, so it is
      // reported as one. A throttled host is not: a retry would only be
      // refused again, so the run is noted as cut short instead.
      if (todo.length && !details.size && !listed.throttled && !throttled) {
        throw new Error(`${name} listed ${todo.length} new postings but no detail could be read`)
      }
      if (listed.throttled || throttled) adapter.note = 'stopped early: the careers site answered 429'
      else keepWorkday(context, name, listed, memo, nowMs)
      // Only postings with their detail are returned. One sent without it
      // would reach the store as "3 Locations" with no body and a guessed
      // date, and a posting already stored is skipped above, keeping its own.
      return todo
        .filter((row) => details.has(row.externalPath))
        .map((row) => toPosting(row, details.get(row.externalPath), { site, company, now }))
    },
  }
  return adapter
}
