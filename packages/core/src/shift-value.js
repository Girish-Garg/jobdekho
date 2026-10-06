import { statedHours, hoursKind } from './shift-hours.js'

// The shifts or hours a line states, as the fact list shows them, for the
// plain reader's lines and the facts model's alike (description-terms.js,
// fact-values.js), most telling first: the hours it gives, a night shift,
// rotating shifts, another region's hours, an afternoon or evening shift,
// any other shift work. A day shift or daytime hours, a line saying there
// are none, and a bare heading ("Shift timings:") whose hours sit on the
// next line, show nothing.
const NONE = /\b(?:no|not|never|don'?t|do not|without)\b[^.;]{0,25}\b(?:nights?|shifts?|weekends)/i
const REGIONS = [
  [/\b(?:US|U\.S\.|USA|American?|EST|EDT|PST|PDT|CST|CDT|MST|ET|PT|AMER|Americas)\b/, 'US hours'],
  [/\b(?:UK|GMT|BST|EMEA|European?|EU|CET|CEST)\b/, 'UK or Europe hours'],
  [/\b(?:Australia|ANZ|AEST)\b/i, 'Australia hours'],
  [/\b(?:APAC|APJ)\b/, null],
]
// Hours in another region's clock are that region's hours: "3 PM to 12 AM
// CST" is a night in India, and only the zone says so.
const ZONE = /\b(?:EST|EDT|PST|PDT|CST|CDT|MST|ET|PT|GMT|BST|CET|CEST|AEST)\b/
const DAYTIME = /\b(?:general|day|first|1st|morning)\s+shifts?\b|\bshifts?\s*\(days?\)|\bdaytime\b/i
// "Shift" that is not about hours: testing early, moving servers, change.
const NOT_HOURS = /\bshift[- ]left\b|\blift\s*(?:and|&)\s*shift\b|\b(?:paradigm|fundamental|market|platform)\s+shifts?\b|\bshifts?\s+(?:in|to|from|towards?)\b/i
const ROTATING = /\brotat\w*|\bround[- ]the[- ]clock\b|\b24\s*[x×*/]\s*7\b/i
const MAYBE = /\b(?:if (?:needed|required)|when (?:needed|required)|as (?:needed|required)|occasional(?:ly)?|may|might|possibl[ey]|flexib\w*)\b/i
const PERIODS = /\b(?:morning|afternoon|evening|day|night)s?\b/gi

// One region's hours, or several named at once.
function regionOf(line) {
  const named = REGIONS.filter(([pattern]) => pattern.test(line))
  if (named.length > 1) return 'Shifts across time zones'
  return named[0]?.[1] ?? null
}

const joined = (texts) => (texts.length > 1 ? `${texts.slice(0, -1).join(', ')} or ${texts.at(-1)}` : texts[0])

// Hours, one window or several: "Late shift, 2 PM to 11 PM", "Late shifts,
// 12 PM to 9 PM or 2 PM to 11 PM", "Shifts, 12 PM to 9 PM or 4:30 PM to
// 1:30 AM" when they differ, or null when every one is daytime.
function hoursValue(line, all) {
  const text = joined(all.map((h) => h.text))
  const zone = line.match(ZONE)?.[0]
  if (zone) return `${regionOf(line) ?? 'Shift'}, ${text} ${zone}`
  const kinds = all.map((h) => hoursKind(h, { night: all.length === 1 && /\bnight/i.test(line) }))
  if (!kinds.some(Boolean)) return null
  if (all.length === 1) return `${kinds[0]}, ${text}`
  return kinds.every((kind) => kind === kinds[0]) ? `${kinds[0]}s, ${text}` : `Shifts, ${text}`
}

// Nights among other shifts, nights now and then, or nights.
function nightValue(line) {
  if (ROTATING.test(line)) return 'Rotational shifts, including nights'
  if (MAYBE.test(line)) return 'Night shifts possible'
  const periods = new Set((line.match(PERIODS) ?? []).map((w) => w.toLowerCase().replace(/s$/, '')))
  return periods.size > 1 ? 'Rotational shifts, including nights' : 'Night shift'
}

function valueOf(line) {
  const hours = statedHours(line)
  if (hours.length) return hoursValue(line, hours)
  if (/\bnight/i.test(line)) return nightValue(line)
  if (ROTATING.test(line)) return 'Rotational shifts'
  const region = regionOf(line)
  if (region) return region
  if (/\b(?:swing|afternoon|evening|second|2nd)\s+shifts?\b/i.test(line)) return 'Afternoon or evening shift'
  const words = line.split(/\s+/).filter((w) => /\w/.test(w)).length
  return words >= 3 && /\bshifts?\b/i.test(line) && !DAYTIME.test(line) && !NOT_HOURS.test(line) ? 'Shift work' : null
}

export function shiftValue(line) {
  if (NONE.test(line)) return null
  const value = valueOf(line)
  return value ? { value } : null
}
