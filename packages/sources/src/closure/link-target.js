import { parseSite } from '../providers/workday-site.js'

// Where a posting's own link is checked to learn whether the job is gone, or
// null where no check can say anything, or none may be made. Checked on
// 2026-09-30:
//   LinkedIn: robots.txt disallows every path to every crawler.
//   Adzuna: robots.txt disallows its /land/ad/ links, the only ones it gives.
//   Instahyre and Remotive: a Cloudflare challenge answers a plain request.
//   Ashby and Unstop: the page is drawn by script and reads the same whether
//   the job is open or not (Unstop's registration deadline closes it instead,
//   see the store's corpus-closure.js).
//   HN "Who is hiring": a comment never closes; only a link out can.
const NEVER = [/^linkedin$/, /^adzuna:/, /^instahyre$/, /^remotive$/, /^ashby:/, /^unstop$/]

// A Workday job page is drawn by script too, but the careers site's own job
// API answers 404 for a posting that is gone ("errorCode":"S21").
function workdayApi(url) {
  const site = parseSite(url.href)
  const at = url.pathname.indexOf('/job/')
  return site && at >= 0 ? `${site.detailBase}${url.pathname.slice(at)}` : null
}

export function checkTarget(row) {
  const source = String(row?.source ?? '')
  if (NEVER.some((re) => re.test(source))) return null
  let url
  try {
    url = new URL(String(row?.url ?? ''))
  } catch {
    return null
  }
  if (!/^https?:$/.test(url.protocol) || url.hostname === 'news.ycombinator.com') return null
  return source.startsWith('workday:') ? workdayApi(url) : url.href
}
