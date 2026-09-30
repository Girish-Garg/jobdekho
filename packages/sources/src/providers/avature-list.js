import { parseList } from './avature-rows.js'

// Postings listed per company per run, newest first, and the most pages that
// may take. A portal sets its own page size and ignores the one asked for
// (Siemens six, Lenovo and Deloitte ten, EA twenty), so both bounds are
// needed: ten pages of six is sixty postings, and listing never costs a
// portal more than ten requests.
export const MAX_POSTINGS = 100
export const MAX_PAGES = 10

export const isThrottled = (err) => /\bHTTP 429\b/.test(String(err?.message || err))

// The page is HTML; the injected http asks for JSON unless told otherwise.
export const HTML = { headers: { Accept: 'text/html,application/xhtml+xml' } }

// A portal behind AWS WAF answers a visitor that runs no script with 202, an
// empty body and x-amzn-waf-action: challenge (careers.ibm.com did). That
// is a refusal, not an empty board, so it fails the source by name; it is
// never worked around.
async function pageText(http, url) {
  const res = await http(url, HTML)
  if (res.status === 202 || res.headers?.get?.('x-amzn-waf-action')) {
    throw new Error(`HTTP ${res.status} bot challenge for ${url}`)
  }
  return res.text()
}

// The list is the portal's SearchJobs page, not its RSS feed. The feed
// (SearchJobs/feed/) takes the same filters, but it lists oldest first and
// ignores jobSort, and an item carries no place, so a portal with 700 open
// roles would have to be read to the end to find this week's.
export async function listIndia(http, site, pause) {
  const rows = new Map()
  let url = site.listUrl
  for (let page = 0; url && page < MAX_PAGES && rows.size < MAX_POSTINGS; page++) {
    if (page) await pause()
    let parsed
    try {
      parsed = parseList(await pageText(http, url), url)
    } catch (err) {
      // The first page failing is the source failing, so it throws and the
      // run records why. A later one ends the listing with what was read:
      // the next page's address comes from the page that failed.
      if (!page) throw err
      return { rows: [...rows.values()], throttled: isThrottled(err) }
    }
    const before = rows.size
    for (const row of parsed.rows) if (!rows.has(row.id) && rows.size < MAX_POSTINGS) rows.set(row.id, row)
    // A page that adds nothing new would only be followed by more of it.
    if (rows.size === before) break
    url = parsed.next
  }
  return { rows: [...rows.values()], throttled: false }
}
