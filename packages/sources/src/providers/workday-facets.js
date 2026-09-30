// The careers site narrows to a country with its own location facet, and so
// does this adapter. A free-text search for "India" would also match a US
// role whose description mentions the Bengaluru team, and miss an Indian one
// whose text never names the country.
//
// The facet's parameter name and its value ids differ per tenant (NVIDIA
// calls the country facet locationHierarchy1, many call it locationCountry,
// Postman has only city-level `locations`), so they are read from the
// response the site itself filters from rather than kept in config.
const COUNTRY = /^india$/i
// Tenants without a country facet name cities alone ("Noida", "Hyderabad").
// Bare "delhi" is left out because Mondelez lists "Delhi, Ohio"; an Indian
// Delhi value says "New Delhi" or carries "India". \b already keeps
// "Indianapolis" and "Remote - Indiana" out.
const INDIAN_PLACE = /\b(india|bengaluru|bangalore|hyderabad|pune|mumbai|chennai|gurugram|gurgaon|noida|new delhi|kolkata|ahmedabad)\b/i
const ELSEWHERE = /\b(pakistan|ohio)\b/i
// FIS names its offices by code ("IND BNGL FL2-3 TWR 3"). Case matters here:
// uppercase IND as a whole word, never the start of "Indiana".
const INDIA_CODE = /^IND\b/

// Some facets are groups whose values are themselves facets: NVIDIA nests
// its country, city and remote facets under one locationMainGroup.
function flatten(facets, out = []) {
  for (const f of facets || []) {
    const values = f?.values || []
    if (values.some((v) => Array.isArray(v?.values))) flatten(values, out)
    else out.push(f)
  }
  return out
}

// Northern Trust lists India under two facets, locationCountry with 64 jobs
// and locationHierarchy1 with 1, so the fullest one wins rather than the first.
const countryFacet = (flat) => {
  let best = null
  for (const f of flat) {
    const india = (f.values || []).find((v) => COUNTRY.test(String(v?.descriptor || '').trim()))
    if (!india?.id || !f.facetParameter) continue
    if (!best || (india.count || 0) > best.count) best = { param: f.facetParameter, id: india.id, count: india.count || 0 }
  }
  return best && { [best.param]: [best.id] }
}

const indian = (v) => {
  const d = String(v?.descriptor || '')
  return Boolean(v?.id) && (INDIAN_PLACE.test(d) || INDIA_CODE.test(d)) && !ELSEWHERE.test(d)
}

// Without a country facet, every Indian city a location facet lists is
// selected at once; Workday ORs the values of one facet, as the site does
// when a visitor ticks several cities.
const cityFacet = (flat) => {
  for (const f of flat) {
    if (!/location/i.test(f.facetParameter || '')) continue
    const ids = (f.values || []).filter(indian).map((v) => v.id)
    if (ids.length) return { [f.facetParameter]: ids }
  }
  return null
}

// appliedFacets for India, or null when the site offers no way to say it.
export function indiaFacets(facets) {
  const flat = flatten(facets)
  return countryFacet(flat) || cityFacet(flat)
}
