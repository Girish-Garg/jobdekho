import { pcsx } from './eightfold-pcsx.js'
import { v2 } from './eightfold-v2.js'

// Both APIs answer ten positions a request, whatever `num` asks for.
const PAGE = 10

// Postings listed per company per run, newest first: ten pages. As with
// Workday, listing reaches further back than one run can describe, and what
// is left is described on the runs that follow.
export const MAX_POSTINGS = 100

export const isThrottled = (err) => /\bHTTP 429\b/.test(String(err?.message || err))
const isRefused = (err) => /\bHTTP 403\b/.test(String(err?.message || err))

const getJson = async (http, url) => (await http(url)).json()

// Which API a tenant speaks is not in its URL, and it can change when the
// tenant moves to PCSX, so it is asked rather than configured: PCSX first,
// since most sites are on it, and the older API when PCSX refuses with 403.
// Anything else from the first page is the source failing, and is thrown.
async function firstPage(http, site, pause) {
  try {
    return { api: pcsx, data: pcsx.page(await getJson(http, pcsx.listUrl(site, 0)), site) }
  } catch (err) {
    if (!isRefused(err)) throw err
  }
  await pause()
  return { api: v2, data: v2.page(await getJson(http, v2.listUrl(site, 0)), site) }
}

// Rows are kept by id: positions sharing one postedTs can trade places
// between two page requests, and one seen twice is still one posting.
export async function listIndia(http, site, pause) {
  const { api, data } = await firstPage(http, site, pause)
  const rows = new Map()
  const add = (list) => list.forEach((r) => r.id && !rows.has(r.id) && rows.set(r.id, r))
  add(data.rows)
  const total = Math.min(Number.isFinite(data.count) ? data.count : MAX_POSTINGS, MAX_POSTINGS)
  let throttled = false
  for (let start = PAGE; data.rows.length >= PAGE && start < total; start += PAGE) {
    await pause()
    let page
    try {
      page = api.page(await getJson(http, api.listUrl(site, start)), site)
    } catch (err) {
      // A later page is skipped, unless the host has started refusing: then
      // nothing more is sent to it this run.
      if (isThrottled(err)) {
        throttled = true
        break
      }
      continue
    }
    add(page.rows)
    if (page.rows.length < PAGE) break
  }
  return { api, rows: [...rows.values()].slice(0, MAX_POSTINGS), throttled }
}
