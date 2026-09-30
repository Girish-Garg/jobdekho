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

// First a one-row request for nothing but the facets, the same response the
// careers site builds its filter panel from. Then the India pages, in the
// site's own order, which is newest first. A site with no location facet at
// all falls back to searching for "India" as text, and core's location rule
// sorts out what that lets in.
export async function listIndia(http, site, pause) {
  const probe = await post(http, site.listUrl, { appliedFacets: {}, limit: 1, offset: 0, searchText: '' })
  const facets = indiaFacets(probe.facets)
  // Every row of a facet-scoped list has at least one Indian location.
  const scoped = Boolean(facets)
  const query = facets ? { appliedFacets: facets, searchText: '' } : { appliedFacets: {}, searchText: 'India' }
  const rows = []
  let total = MAX_POSTINGS
  for (let offset = 0; offset < Math.min(total, MAX_POSTINGS); offset += PAGE) {
    await pause()
    let data
    try {
      data = await post(http, site.listUrl, { ...query, limit: PAGE, offset })
    } catch (err) {
      // The first page failing is the source failing, so it throws and the
      // run records why. A later page is skipped, unless the host has started
      // refusing: then nothing more is sent to it this run.
      if (offset === 0) throw err
      if (isThrottled(err)) return { rows, scoped, throttled: true }
      continue
    }
    // total is reported on the first page only; later pages send 0.
    if (offset === 0 && Number.isFinite(data.total)) total = data.total
    const got = data.jobPostings || []
    rows.push(...got)
    if (got.length < PAGE) break
  }
  return { rows, scoped, throttled: false }
}
