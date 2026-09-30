import { PAGE, getJson, isThrottled, listUrl, suggestUrl } from './oracle-api.js'
import { indiaFromFacets, indiaFromSuggestions } from './oracle-facets.js'

// Postings listed per board per run, newest first: four pages. Listing is
// cheap next to the detail calls, which oracle-select.js caps separately, so
// the window reaches further back than one run can describe and the rest is
// described on the runs that follow.
export const MAX_POSTINGS = 100

// A one-row request for nothing but the location facet, the response the
// site builds its filter panel from, and the search box only when the facet
// does not name India.
async function findIndia(http, site, pause) {
  await pause()
  const probe = await getJson(http, listUrl(site, { limit: 1 }))
  const fromFacet = indiaFromFacets(probe?.items?.[0]?.locationsFacet)
  if (fromFacet) return fromFacet
  await pause()
  const suggested = await getJson(http, suggestUrl(site))
  return indiaFromSuggestions(suggested?.items)
}

// { india, rows, throttled }. india is null when the site knows no India
// location at all, and then nothing is listed.
export async function listIndia(http, site, pause) {
  const india = await findIndia(http, site, pause)
  const rows = []
  if (!india) return { india, rows, throttled: false }
  let total = MAX_POSTINGS
  for (let offset = 0; offset < Math.min(total, MAX_POSTINGS); offset += PAGE) {
    await pause()
    let page
    try {
      page = (await getJson(http, listUrl(site, { limit: PAGE, offset, india })))?.items?.[0]
    } catch (err) {
      // The first page failing is the source failing, so it throws and the
      // run records why. A later page is skipped, unless the host has started
      // refusing: then nothing more is sent to it this run.
      if (offset === 0) throw err
      if (isThrottled(err)) return { india, rows, throttled: true }
      continue
    }
    // Every page repeats the facet-scoped total, unlike Workday's.
    if (Number.isFinite(page?.TotalJobsCount)) total = page.TotalJobsCount
    const got = page?.requisitionList || []
    rows.push(...got)
    if (got.length < PAGE) break
  }
  return { india, rows, throttled: false }
}
