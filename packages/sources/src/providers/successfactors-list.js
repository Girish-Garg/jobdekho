import { parseSearch } from './successfactors-rows.js'
import { isThrottled } from './successfactors-get.js'

// Postings listed per board per run, newest first. Page size is each site's
// own setting (25 at EY and Asian Paints, 10 at YASH and Mahindra, 35 or
// more at Volvo) and the URL cannot change it, so both the rows and the
// pages are capped: a 10-row site stops at 50 rows rather than sending ten
// requests. Listing is cheap next to the job pages, which the select step
// caps separately; what one run cannot describe waits for the next.
export const MAX_POSTINGS = 100
export const MAX_PAGES = 5

export const UNIFY_ERROR = 'this careers site is a Unify site: it draws its jobs in the browser from /services/, which its robots.txt disallows'

// Pages are read in the site's order, newest first, stepping startrow by
// the rows each page actually held. A posting published between two page
// requests pushes a row onto the next page, so rows are kept by id.
export async function listIndia(get, site) {
  const rows = new Map()
  let startrow = 0
  let total = MAX_POSTINGS
  let size = 0
  for (let page = 0; page < MAX_PAGES && rows.size < Math.min(total, MAX_POSTINGS); page++) {
    let found
    try {
      found = parseSearch(await get(site.searchUrl(startrow)))
    } catch (err) {
      // The first page failing is the source failing, so it throws and the
      // run records why. A later page is skipped at the first page's size,
      // unless the host has started refusing: then nothing more goes to it.
      if (page === 0) throw err
      if (isThrottled(err)) return { rows: [...rows.values()], throttled: true }
      startrow += size
      continue
    }
    if (page === 0) {
      if (found.unify && !found.rows.length) throw new Error(UNIFY_ERROR)
      // A count with no readable row is a layout this parser does not know,
      // which must fail loudly rather than pass for a quiet board.
      if (found.total && !found.rows.length) throw new Error(`the search page reports ${found.total} jobs but no row could be read`)
      if (found.total) total = found.total
      size = found.rows.length
    }
    if (!found.rows.length) break
    for (const row of found.rows) if (!rows.has(row.id)) rows.set(row.id, row)
    startrow += found.rows.length
    if (startrow >= total) break
  }
  return { rows: [...rows.values()].slice(0, MAX_POSTINGS), throttled: false }
}
