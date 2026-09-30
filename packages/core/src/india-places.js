// Indian cities by one canonical name, with the other spellings job boards
// use, and the metro each belongs to. One list for everything that reads a
// place: the fit score now, and the scraper's location clean-up later, so
// "Bengaluru" and "Bangalore" can never be one city in one place and two in
// another. Row: [id, display name, other spellings joined by |, metro].
//
// A metro groups the cities one person can commute between (Thane with
// Mumbai, Gurugram with Delhi), because a job in the next city over is not a
// move. A row with no metro is its own.
const CITIES = [
  ['bengaluru', 'Bengaluru', 'bangalore|blr|bangalore urban|bengaluru urban|greater bengaluru'],
  ['mumbai', 'Mumbai', 'bombay|mumbai suburban|greater mumbai'],
  ['navi mumbai', 'Navi Mumbai', '', 'mumbai'],
  ['thane', 'Thane', '', 'mumbai'],
  ['mira bhayandar', 'Mira-Bhayandar', 'mira road|bhayandar', 'mumbai'],
  ['vasai virar', 'Vasai-Virar', 'vasai|virar', 'mumbai'],
  ['kalyan', 'Kalyan-Dombivli', 'dombivli', 'mumbai'],
  ['pune', 'Pune', 'pimpri|chinchwad|hinjewadi|hinjawadi'],
  ['delhi', 'Delhi', 'new delhi|delhi ncr|ncr'],
  ['gurugram', 'Gurugram', 'gurgaon', 'delhi'],
  ['noida', 'Noida', 'greater noida', 'delhi'],
  ['ghaziabad', 'Ghaziabad', '', 'delhi'],
  ['faridabad', 'Faridabad', '', 'delhi'],
  ['hyderabad', 'Hyderabad', 'secunderabad|cyberabad|hitec city|hitech city'],
  ['chennai', 'Chennai', 'madras'],
  ['kolkata', 'Kolkata', 'calcutta|howrah|salt lake'],
  ['ahmedabad', 'Ahmedabad', 'amdavad'],
  ['gandhinagar', 'Gandhinagar', 'gift city', 'ahmedabad'],
  ['surat', 'Surat'], ['vadodara', 'Vadodara', 'baroda'], ['rajkot', 'Rajkot'],
  ['jaipur', 'Jaipur'], ['indore', 'Indore'], ['bhopal', 'Bhopal'], ['nagpur', 'Nagpur'],
  ['nashik', 'Nashik', 'nasik'], ['aurangabad', 'Chhatrapati Sambhajinagar', 'sambhajinagar'],
  ['lucknow', 'Lucknow'], ['kanpur', 'Kanpur'], ['varanasi', 'Varanasi', 'banaras|benaras'], ['agra', 'Agra'],
  ['chandigarh', 'Chandigarh', 'tricity'],
  ['mohali', 'Mohali', 'sas nagar', 'chandigarh'],
  ['panchkula', 'Panchkula', '', 'chandigarh'],
  ['ludhiana', 'Ludhiana'], ['amritsar', 'Amritsar'], ['dehradun', 'Dehradun'],
  ['kochi', 'Kochi', 'cochin|ernakulam|kakkanad|infopark'],
  ['thiruvananthapuram', 'Thiruvananthapuram', 'trivandrum|technopark'],
  ['kozhikode', 'Kozhikode', 'calicut'],
  ['coimbatore', 'Coimbatore', 'kovai'], ['madurai', 'Madurai'],
  ['tiruchirappalli', 'Tiruchirappalli', 'trichy|tiruchi'],
  ['salem', 'Salem'], ['erode', 'Erode'], ['vellore', 'Vellore'], ['hosur', 'Hosur'],
  ['mysuru', 'Mysuru', 'mysore'], ['mangaluru', 'Mangaluru', 'mangalore'],
  ['hubballi', 'Hubballi', 'hubli|dharwad'],
  ['visakhapatnam', 'Visakhapatnam', 'vizag|vishakhapatnam'], ['vijayawada', 'Vijayawada'],
  ['bhubaneswar', 'Bhubaneswar', 'bhubaneshwar'], ['guwahati', 'Guwahati'],
  ['patna', 'Patna'], ['ranchi', 'Ranchi'], ['jamshedpur', 'Jamshedpur'], ['raipur', 'Raipur'],
  ['goa', 'Goa', 'panaji|panjim|margao'],
]

// States and the country itself: enough to tell "somewhere in India" from
// "somewhere else" when no city is named.
const INDIA_WORDS = /\b(india|karnataka|maharashtra|tamil nadu|telangana|andhra pradesh|kerala|gujarat|rajasthan|uttar pradesh|madhya pradesh|west bengal|haryana|punjab|odisha|orissa|bihar|jharkhand|assam|uttarakhand|himachal pradesh|chhattisgarh|jammu|kashmir|puducherry|pondicherry)\b/i

const BY_ID = new Map(CITIES.map(([id, name, aliases = '', metro = id]) => [id, { id, name, metro, aliases: aliases ? aliases.split('|') : [] }]))
const NAMES = new Map([...BY_ID.values()].flatMap((c) => [c.id, ...c.aliases].map((n) => [n, c.id])))
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Longest first, so "navi mumbai" is read before "mumbai" and "new delhi"
// before "delhi".
const FIND = new RegExp(`\\b(?:${[...NAMES.keys()].sort((a, b) => b.length - a.length).map(esc).join('|')})\\b`, 'gi')

// Every city a location names, canonical and in order, once each:
// "Delhi, Gurgaon, Noida" is three cities, not one string.
export function citiesIn(text) {
  const found = [...String(text || '').matchAll(FIND)].map((m) => NAMES.get(m[0].toLowerCase().replace(/\s+/g, ' ')))
  return [...new Set(found.filter(Boolean))]
}

// One place a person typed ("bangalore", "Gurgaon") as its canonical id, or
// null for something that is not a city on this list.
export function canonicalCity(name) {
  const key = String(name || '').toLowerCase().trim().replace(/\s+/g, ' ')
  return NAMES.get(key) ?? citiesIn(key)[0] ?? null
}

export const cityName = (id) => BY_ID.get(id)?.name ?? null
export const metroOf = (id) => BY_ID.get(id)?.metro ?? null
export const inIndia = (text) => citiesIn(text).length > 0 || INDIA_WORDS.test(String(text || ''))
