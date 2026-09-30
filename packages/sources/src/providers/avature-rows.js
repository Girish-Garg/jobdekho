import { load } from 'cheerio'
import { dateFrom } from './avature-dates.js'

// A posting's page is /JobDetail/<slug>/<id> or, on some portals, just
// /JobDetail/<id>. The id is the posting; the slug is its title and changes
// with it (Avature serves the posting whatever slug is sent).
const DETAIL = /\/JobDetail\/(?:[^/]+\/)?(\d+)\/?$/
const OFFSET = /^(\w+)Offset$/
const flat = (node) => node.text().replace(/\s+/g, ' ').trim()
const bare = (path) => path.replace(/\/+$/, '')

const sameSite = (href, base) => {
  try {
    const u = new URL(href, base)
    return u.origin === new URL(base).origin ? u : null
  } catch {
    return null
  }
}

// Portals word a list row differently. EA and Siemens mark the place with a
// "list-item-location" class; Lenovo and Deloitte leave their spans bare,
// where the place is the one span with a comma in it ("India, Karnataka,
// BANGALORE"), never the business unit beside it ("Acme I Acme Global - India
// Offices"). "Multiple Locations" has none and stays blank, which the
// relevance filter reads as no objection; the posting's page names them.
function placeOf($, card) {
  const marked = card.find('[class*="location"]').first()
  if (marked.length) return flat(marked)
  const spans = card.find('[class*="subtitle"] span').toArray().map((s) => flat($(s)))
  return spans.find((t) => t.includes(',')) || ''
}

const POSTED = /\bposted(?:\s+(?:on|since))?:?\s+(.{6,30})/i

// The rows of one list page, in the site's own order, which is newest first.
// Only the first link to a posting is its title: the same card links it
// again from an Apply button, and from share links that are not on the site.
function rowsOf($, pageUrl) {
  const rows = new Map()
  $('a[href*="/JobDetail/"]').each((_, a) => {
    const u = sameSite($(a).attr('href'), pageUrl)
    const id = u?.pathname.match(DETAIL)?.[1]
    const title = flat($(a))
    if (!id || rows.has(id) || !title) return
    const card = $(a).closest('article, li')
    const posted = flat(card).match(POSTED)
    rows.set(id, { id, title, url: u.href, location: placeOf($, card), postedAt: dateFrom(posted?.[1]) })
  })
  return [...rows.values()]
}

// The next page is the site's own pagination link with the smallest offset
// past this page. Portals page by jobOffset or folderOffset, ten or six or
// twenty at a time, whatever a request asks for, so the link the page prints
// is followed rather than an offset worked out here. Only a link to this
// same list counts; the language switcher repeats the page in other locales.
function nextOf($, pageUrl) {
  const here = new URL(pageUrl)
  const offsetOf = (u) => {
    for (const [k, v] of u.searchParams) if (OFFSET.test(k)) return Number(v)
    return 0
  }
  const current = offsetOf(here)
  let best = null
  $('a[href*="Offset="]').each((_, a) => {
    const u = sameSite($(a).attr('href'), pageUrl)
    if (!u || bare(u.pathname) !== bare(here.pathname)) return
    const at = offsetOf(u)
    if (at > current && (!best || at < best.at)) best = { at, url: u.href }
  })
  return best?.url || null
}

export function parseList(html, pageUrl) {
  const $ = load(String(html || ''))
  return { rows: rowsOf($, pageUrl), next: nextOf($, pageUrl) }
}
