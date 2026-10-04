// jobs.mercedes-benz.com draws its search in the browser from the board's own
// API: one GET whose data parameter is the search as JSON, in the shape the
// board's script builds (LanguageCode, SearchParameters, SearchCriteria). No
// login, cookie or token, and the API host has no robots.txt (404). Its
// country filter names India by the board's own id, 390, read from the
// country facet on 2026-10-04 alongside each ad's CountryCode "IN". India
// then held 221 ads, newest first; the board's map view asks for up to 5000
// at once, so one request reads all of India.
const API = 'https://jobs.api.mercedes-benz.com/search'
const INDIA = 390
const MAX_ADS = 500
const FIELDS = [
  'ID', 'PositionID', 'PositionTitle', 'PositionURI', 'ParentOrganizationName',
  'PositionLocation.CityName', 'PositionLocation.CountryCode', 'JobCategory.Name', 'PublicationStartDate',
]

export const searchUrl = () => `${API}?data=${encodeURIComponent(JSON.stringify({
  LanguageCode: 'EN',
  SearchParameters: {
    FirstItem: 1,
    CountItem: MAX_ADS,
    Sort: [{ Criterion: 'PublicationStartDate', Direction: 'DESC' }],
    MatchedObjectDescriptor: FIELDS,
  },
  SearchCriteria: [{ CriterionName: 'PositionLocation.Country', CriterionValue: [INDIA] }],
}))}`

const indian = (ad) => (ad?.PositionLocation || []).some((place) => place?.CountryCode === 'IN')

// Each requisition (PositionID, "mer00048zv") is published as several ads,
// three apiece on 2026-10-04, so it is kept once, as its newest ad. A reply
// without the result list, or whose India filter returns ads in some other
// country, is thrown: the board's shape or ids changed, which must not read
// as a quiet board. `complete` is whether every Indian ad came back.
export function parseSearch(reply) {
  const result = reply?.SearchResult
  if (!Array.isArray(result?.SearchResultItems)) throw new Error('mercedesbenz search answered without a result list')
  const ads = result.SearchResultItems.map((item) => item?.MatchedObjectDescriptor).filter(Boolean)
  if (ads.length && !ads.some(indian)) throw new Error('mercedesbenz search for India answered with ads elsewhere')
  const byRequisition = new Map()
  for (const ad of ads) {
    const id = String(ad.PositionID || '').trim()
    if (id && indian(ad) && !byRequisition.has(id)) byRequisition.set(id, ad)
  }
  const total = Number(result.SearchResultCountAll)
  return { rows: [...byRequisition.values()], complete: !Number.isFinite(total) || ads.length >= total }
}
