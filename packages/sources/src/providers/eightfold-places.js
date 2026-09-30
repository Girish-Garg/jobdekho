// Tenants type their own place names, and many do not name the country:
// Infineon lists "Bangalore BTP", Lam Research "IN-Bangalore (3811)". The
// newer API also sends each place in a standard form, "Bengaluru, KA, IN",
// which is read instead whenever it is there. Its trailing ISO code is spelt
// out for India only, because core's location rule looks for the word: a
// "Coimbatore, TN, IN" would otherwise fail it, and a "San Diego, CA, US"
// that a remote-friendly search let in should.
const INDIA_CODE = /,\s*IN$/

const tidy = (place) => String(place || '').trim().replace(INDIA_CODE, ', India')

// Microsoft lists "India, Telangana, Hyderabad" twice on one posting, and
// Infineon "Hyderabad" and "hyderabad"; a place appears once.
export function placesOf(standard, typed) {
  const list = Array.isArray(standard) && standard.length ? standard : typed
  const seen = new Set()
  const out = []
  for (const p of Array.isArray(list) ? list : []) {
    const place = tidy(p)
    const key = place.toLowerCase()
    if (place && !seen.has(key)) {
      seen.add(key)
      out.push(place)
    }
  }
  return out
}

// Both APIs date a posting in whole seconds since the epoch.
export const fromSeconds = (s) => (Number.isFinite(s) && s > 0 ? new Date(s * 1000).toISOString() : null)
