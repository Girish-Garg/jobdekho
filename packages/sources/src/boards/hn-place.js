// Whether an HN "Who is hiring" post is for someone in India: a place in
// India, or remote work open outside the places it names. The header line
// carries the place by convention ("Acme | Engineer | REMOTE (worldwide)"),
// and the opening of the body often carries the lock ("US only", "must be
// in EST"), so both are read.
//
// A remote post that names a place or region outside India ("NYC or Remote",
// "USA/Canada: REMOTE", "Remote | Stockholm, Sweden") means remote within it
// in nearly every case, so it is kept only when it also says worldwide; one
// only partly remote is left out too. Of the 254 posts in the September 2026
// thread, the first version of this kept 63, and 35 of those were such.
const INDIA = /\b(india|bengaluru|bangalore|hyderabad|pune|mumbai|new delhi|delhi|ncr|gurgaon|gurugram|noida|chennai|kolkata|ahmedabad|jaipur|kochi|indore|chandigarh)\b/i
const REMOTE = /\bremote\b/i
const WORLD = /\b(worldwide|world-wide|global(?:ly)?|anywhere|everywhere|international|any ?time ?zone)\b/i
const ONLY_WORLD = /^\W*(worldwide|global|anywhere|everywhere)\W*$/i

// Places and regions outside India as headers write them. Codes are matched
// as written, so the "us" of "join us" is no country, and a "City, ST" pair
// by its US state or Canadian province.
const ABROAD_NAMES = new RegExp(`\\b(${[
  'united states', 'america', 'americas', 'latam', 'latin america', 'canada', 'mexico', 'brazil', 'argentina',
  'united kingdom', 'england', 'ireland', 'europe', 'european', 'germany', 'france', 'netherlands', 'spain',
  'portugal', 'poland', 'romania', 'sweden', 'norway', 'denmark', 'finland', 'switzerland', 'austria', 'belgium',
  'italy', 'israel', 'australia', 'new zealand', 'japan', 'singapore', 'san francisco', 'bay area', 'new york',
  'seattle', 'boston', 'austin', 'chicago', 'los angeles', 'denver', 'boulder', 'toronto', 'vancouver', 'montreal',
  'miami', 'atlanta', 'london', 'berlin', 'munich', 'paris', 'amsterdam', 'stockholm', 'zurich', 'dublin', 'sydney',
].join('|')})\\b`, 'i')
const STATES = 'AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC|ON|BC|QC'
const CODES = 'US|USA|UK|EU|EMEA|LATAM|AUS|NYC|SF|EST|EDT|PST|PDT|CST|CET|CEST|GMT|UTC'
const ABROAD_CODES = new RegExp(`\\b(${CODES})\\b|\\bU\\.S\\.|,\\s*(${STATES})\\b`)
const abroad = (text) => ABROAD_NAMES.test(text) || ABROAD_CODES.test(text)

// Whether a header field names a place, in India or not.
export const namesPlace = (text) => INDIA.test(text) || abroad(text)

// Said anywhere in the header or the opening: a region lock, hours to keep
// in a time zone far from India's, or remote only in part. Country codes are
// matched as written here too.
const LOCKED = new RegExp([
  'remote[^|\\n]{0,40}?\\b(united states|canada|north america|americas|latam|latin america|europe)\\b',
  '\\b(residents|citizens) only\\b',
  '\\bmust be (?:based|located|living) in\\b',
  '\\bmust be on ?site\\b',
  '\\bremote will be ignored\\b',
  '\\bauthori[sz]ed to work in the (?:us|u\\.s\\.|united states|uk|eu)\\b',
  '\\b(?:est|edt|pst|pdt|cst|cet|cest|et|pt|gmt|utc)\\b[^|\\n]{0,24}?\\b(?:hours|overlap|time ?zones?)\\b',
  '\\b(?:eastern|pacific|central european) (?:time|time ?zone|hours)\\b',
  '\\b(?:partially|partly|part) remote\\b',
  '\\b(?:remote possible|open to remote)\\b',
].join('|'), 'i')
const LOCKED_CODES = new RegExp([
  '(?:remote|Remote|REMOTE)[^|\\n]{0,40}?(?:\\b(?:US|USA|EU|UK|EMEA)\\b|\\bU\\.S\\.)',
  '(?:\\b(?:US|USA|EU|UK)|\\bU\\.S\\.)[- ](?:only|Only|ONLY)\\b',
  '(?:\\bUS|\\bU\\.S\\.) (?:citizens?|persons?|residents?|work authori[sz]ation)\\b',
].join('|'))
const locked = (text) => LOCKED.test(text) || LOCKED_CODES.test(text)

const OPENING = 400

// { keep, location }: the header part that names the place, else "Remote".
// The company's own name (the first part) is never read as a place, and
// India named only in the body counts when the header names nowhere else.
export function placeOf(parts, body) {
  const opening = String(body || '').slice(0, OPENING)
  const rest = parts.slice(1)
  const indian = parts.find((part) => INDIA.test(part))
  if (indian || (INDIA.test(opening) && !rest.some(abroad))) {
    const where = indian || 'India'
    return { keep: true, location: /\bindia\b/i.test(where) ? where : `${where}, India` }
  }
  const remote = parts.find((part) => REMOTE.test(part))
  if (!remote || locked(parts.join(' | ')) || locked(opening)) return { keep: false, location: '' }
  const open = rest.some((part) => (REMOTE.test(part) && WORLD.test(part)) || ONLY_WORLD.test(part))
  return open || !rest.some(abroad) ? { keep: true, location: remote } : { keep: false, location: '' }
}
