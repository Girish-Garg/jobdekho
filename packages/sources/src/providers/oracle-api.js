// The REST resources an Oracle careers site calls for itself, on the host its
// page names (oracle-site.js). None needs a login or a cookie.
const REST = '/hcmRestApi/resources/latest'

// The careers site asks for 24 at a time; 25 is answered just as readily and
// makes the 100-posting window an even four pages.
export const PAGE = 25

export const isThrottled = (err) => /\bHTTP 429\b/.test(String(err?.message || err))

export async function getJson(http, url) {
  const res = await http(url)
  return res.json()
}

// A finder's parameters are one string, joined by commas, the way the site
// sends them. Only the location facet is asked for: it is the one read, and
// every other facet is work the server would do for nothing. Newest first,
// so a capped list is the most recent part of the board.
export function listUrl(site, { limit, offset = 0, india = null }) {
  const params = [`siteNumber=${site.siteNumber}`, 'facetsList=LOCATIONS', `limit=${limit}`, `offset=${offset}`]
  if (india) params.push('lastSelectedFacet=LOCATIONS', `selectedLocationsFacet=${india}`)
  params.push('sortBy=POSTING_DATES_DESC')
  return `${site.api}${REST}/recruitingCEJobRequisitions?onlyData=true`
    + `&expand=requisitionList.secondaryLocations&finder=findReqs;${params.join(',')}`
}

// The Id is quoted inside the finder; %22 is the quote.
export const detailUrl = (site, id) =>
  `${site.api}${REST}/recruitingCEJobRequisitionDetails?expand=all&onlyData=true`
  + `&finder=ById;Id=%22${encodeURIComponent(id)}%22,siteNumber=${site.siteNumber}`

// What the site's location search box asks as a visitor types "India".
export const suggestUrl = (site) =>
  `${site.api}${REST}/recruitingCESearchAutoSuggestions?expand=all&onlyData=true&finder=findByLoc;string=India&limit=20`
