import { indiaFacets } from './workday-facets.js'

// Workday's own page size: the careers site asks for 20 at a time.
const PAGE = 20

// Postings listed per company per run, newest first: five pages. Listing is
// cheap next to the detail calls, which workday-select.js caps separately, so
// the window can reach further back than one run can describe and the rest
// is described on the runs that follow.
export const MAX_POSTINGS = 100

export const isThrottled = (err) => /\bHTTP 429\b/.test(String(err?.message || err))

async function post(http, url, body) {
  const res = await http(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

// India the way the careers site asks for it: by its own location facet when
// it has one, else by searching for "India" as text, and core's location rule
// sorts out what that lets in.
const queryFor = (facets) => (facets ? { appliedFacets: facets, searchText: '' } : { appliedFacets: {}, searchText: 'India' })

// The first page, with the facets a recent run found (workday-memo.js) when
// there are some. Otherwise, or when they no longer work (a failure, or an
// empty list where the last full read had postings), a one-row request for
// nothing but the facets, the same response the careers site builds its
// filter panel from, and the page again.
async function firstPage(http, site, pause, memo) {
  if (memo && memo.facets !== undefined) {
    try {
      const data = await post(http, site.listUrl, { ...queryFor(memo.facets), limit: PAGE, offset: 0 })
      if (!(memo.total > 0 && !data.total)) return { data, facets: memo.facets, probed: false }
    } catch (err) {
      if (isThrottled(err)) throw err
    }
    await pause()
  }
  const probe = await post(http, site.listUrl, { appliedFacets: {}, limit: 1, offset: 0, searchText: '' })
  const facets = indiaFacets(probe.facets)
  await pause()
  return { data: await post(http, site.listUrl, { ...queryFor(facets), limit: PAGE, offset: 0 }), facets, probed: true }
}

// The India pages in the site's own order, which is newest first. `quiet` is
// a tenant whose first page holds only postings the store already has
// (`isKnown`) while its count matches the last full read: nothing has come or
// gone since, so the rest is not read. The first page failing is the source
// failing, so it throws; a later one is skipped, unless the host has started
// refusing: then nothing more is sent to it this run.
export async function listIndia(http, site, pause, { memo = null, isKnown = null } = {}) {
  const first = await firstPage(http, site, pause, memo)
  const rows = [...(first.data?.jobPostings || [])]
  // total is reported on the first page only; later pages send 0.
  const total = Number.isFinite(first.data?.total) ? first.data.total : MAX_POSTINGS
  const out = { rows, scoped: Boolean(first.facets), facets: first.facets, probed: first.probed, total, throttled: false, quiet: false }
  const same = memo?.total != null && memo.total === total
  if (same && rows.length && isKnown && rows.every(isKnown)) return { ...out, quiet: true }
  if (rows.length < PAGE) return out
  for (let offset = PAGE; offset < Math.min(total, MAX_POSTINGS); offset += PAGE) {
    await pause()
    let data
    try {
      data = await post(http, site.listUrl, { ...queryFor(first.facets), limit: PAGE, offset })
    } catch (err) {
      if (isThrottled(err)) return { ...out, throttled: true }
      continue
    }
    const got = data.jobPostings || []
    rows.push(...got)
    if (got.length < PAGE) break
  }
  return out
}
