// Career Site Builder writes a place as city, region, country code and
// postcode: "Kolkata, WB, IN, 700091", "Pune, IN", or just "IN". Core's
// location rule reads place names, not codes, so India's code is written
// out. Only in the country's position, the last named part: in
// "Indianapolis, IN, US" the IN is Indiana.
const POSTCODE = /^\d[\d\s-]*$/

export function placeName(text) {
  // The postcode names nothing a filter could ask for, so it is dropped.
  const parts = String(text || '').split(',').map((p) => p.trim()).filter((p) => p && !POSTCODE.test(p))
  if (parts.at(-1) === 'IN') parts[parts.length - 1] = 'India'
  return parts.join(', ')
}

// A job page can name one city twice, once as a structured address
// ("Pune, MH, India") and again as a free-text one ("Pune, India"). The
// first spelling of each city is kept.
export function distinctCities(places) {
  const seen = new Set()
  return places.filter((place) => {
    const city = place.split(',')[0].trim().toLowerCase()
    if (!city || seen.has(city)) return false
    seen.add(city)
    return true
  })
}
