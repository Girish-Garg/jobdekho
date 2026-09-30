import { citiesIn, canonicalCity, cityName, metroOf, inIndia } from './india-places.js'

// How reachable a posting's place is for the places a profile names, 0 to 1,
// with the phrase the fit card prints. A different Indian city is a move,
// not a wall, so it costs less than a job abroad or a remote role that only
// hires in another country.
//
// The remote rule restates the one in location.js (a remote posting that
// names a region outside India's reach is a lock) rather than importing it,
// because that module is the scraper's relevance floor and keeps its rules
// private. The two should converge once both sides settle.
const REMOTE = /remote|work from home|\bwfh\b|anywhere|worldwide|home based/i
const REACHABLE = /\b(india|apac|asia|asia[ -]pacific|worldwide|anywhere|global(?:ly)?|international)\b/i
const FILLER = /\b(remote|work|from|home|wfh|based|fully|only|first|friendly|ok|okay|optional|flexible|telecommute|distributed|position|role|job|full|part|time|in)\b|[^a-z]/g
const remoteOpen = (piece) => REACHABLE.test(piece) || piece.toLowerCase().replace(FILLER, '') === ''

// The profile's places, read once per request: canonical cities, their
// metros, whether remote is wanted, and anything this list does not know
// ("london") kept as plain words.
export function wantedPlaces(locations = []) {
  const cities = new Set()
  const words = []
  let remote = false
  for (const raw of locations) {
    const place = String(raw).toLowerCase().trim()
    if (!place) continue
    if (REMOTE.test(place)) remote = true
    else if (canonicalCity(place)) cities.add(canonicalCity(place))
    else words.push(place)
  }
  const metros = new Set([...cities].map(metroOf))
  return { any: cities.size + words.length > 0 || remote, cities, metros, remote, words }
}

function pieceFit(piece, workMode, want) {
  const cities = citiesIn(piece)
  const hit = cities.find((c) => want.cities.has(c))
  if (hit) return { value: 1, why: `in ${cityName(hit)}` }
  const near = cities.find((c) => want.metros.has(metroOf(c)))
  if (near) return { value: 0.9, why: `in ${cityName(near)}, near a city you want` }
  if (want.words.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(piece))) {
    return { value: 1, why: `in ${piece}` }
  }
  if (REMOTE.test(piece) || (workMode === 'remote' && !cities.length && !inIndia(piece))) {
    if (!remoteOpen(piece)) return { value: 0.2, why: 'remote, but only for another region' }
    return { value: want.remote ? 1 : 0.85, why: 'remote' }
  }
  if (cities.length) return { value: 0.6, why: `in ${cityName(cities[0])}, not a place you listed` }
  if (inIndia(piece)) return { value: 0.8, why: 'somewhere in India, city not named' }
  return { value: 0.15, why: 'outside India' }
}

// Each ";"- or "|"-separated place is judged on its own and the best wins,
// so "Bangalore, India; Remote, Canada" is a Bangalore job.
export function placeFit(location, workMode, want) {
  if (!want?.any) return { value: 1, why: null }
  const pieces = String(location || '').split(/\s*[;|]\s*|\s+\/\s+/).map((p) => p.trim()).filter(Boolean)
  if (!pieces.length) {
    if (workMode === 'remote') return { value: want.remote ? 1 : 0.85, why: 'remote' }
    return { value: 0.8, why: 'place not stated' }
  }
  return pieces.map((p) => pieceFit(p, workMode, want)).reduce((best, r) => (r.value > best.value ? r : best))
}
