// The careers site narrows to a country with its own location facet, and so
// does this adapter. A keyword search for "India" would also match a US role
// whose description mentions the Bengaluru team.
//
// India's location id is not one number across Oracle: it was
// 300000000361484 at Texas Instruments, 300000000469485 at Honeywell and
// 300000000228786 at Emerson, so it is read from the site each run.
const INDIA = /^india$/i

const named = (v) => INDIA.test(String(v?.Name || '').trim())

// The facet lists a site's busiest places, countries, states and cities
// ranked together, and most sites cut it at ten: at Oceaneering India was the
// tenth. A board where India is outranked by one country's states and cities
// has no India value here even with jobs there.
export function indiaFromFacets(values) {
  const india = (values || []).find(named)
  return india?.Id ? String(india.Id) : null
}

// So the fallback is the site's location search box, which answers from the
// whole geography list as a visitor types. It also suggests "Indiahoma > OK >
// United States" and "India Cement Factory Chilamakuru > Andhra Pradesh >
// India", which the whole-name match keeps out, and Level 1, a country, keeps
// out any town that happens to be called India.
export function indiaFromSuggestions(items) {
  const india = (items || []).find((s) => Number(s?.Level) === 1 && named(s))
  return india?.Id ? String(india.Id) : null
}
