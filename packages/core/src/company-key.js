// The same employer is scraped as "PHONEPE LIMITED", "Phonepe" and "PhonePe
// Private Limited", and asked about as "PhonePe" or "PhonePe's". A key drops
// case, punctuation and the legal tail so all of them meet: the feed's
// company filter matches by it (see the store's posting-filters.js), and the
// chat finds the companies a question names by it.
const LEGAL_TAIL = new Set([
  'limited', 'ltd', 'pvt', 'private', 'inc', 'llc', 'llp', 'corp', 'corporation', 'co', 'company',
  'india', 'technologies', 'technology', 'solutions', 'services', 'software', 'group',
])

// Greenhouse boards with no display name come through as their slug, run
// together: "Razorpaysoftwareprivatelimited". The long legal words are
// peeled off the end of the last word as well; the short ones are not, or
// "Cisco" would lose its "co".
const RUN_TOGETHER_TAIL = [
  'limited', 'private', 'software', 'technologies', 'technology', 'solutions', 'services', 'corporation', 'india', 'group',
]

// What a peel has to leave behind: "Indiaservices" is not peeled down to "".
const MIN_STEM = 3

export const words = (text) => String(text ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean)

function peel(word) {
  const tail = RUN_TOGETHER_TAIL.find((end) => word.endsWith(end) && word.length - end.length >= MIN_STEM)
  return tail ? peel(word.slice(0, -tail.length)) : word
}

export function companyKey(name) {
  const tokens = words(name)
  while (tokens.length > 1 && LEGAL_TAIL.has(tokens.at(-1))) tokens.pop()
  if (tokens.length) tokens.push(peel(tokens.pop()))
  return tokens.join(' ')
}

// The key run together, for a match that has to meet a slug as well: a board
// known only by its slug ("WesternDigital", "grafanalabs") has no spaces left
// to split it by. Blocking a company matches by this (see the store's
// blocked-companies.js), so no spelling of a blocked employer slips through;
// the company filter keeps the spaced key above.
export const compactKey = (name) => companyKey(name).replaceAll(' ', '')
