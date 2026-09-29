import { COMMON_WORDS } from './common-words.js'

// The same employer is scraped as "PHONEPE LIMITED", "Phonepe" and "PhonePe
// Private Limited", and asked about as "PhonePe" or "PhonePe's". A key drops
// case, punctuation and the legal tail so all of them meet.
const LEGAL_TAIL = new Set([
  'limited', 'ltd', 'pvt', 'private', 'inc', 'llc', 'llp', 'corp', 'corporation', 'co', 'company',
  'india', 'technologies', 'technology', 'solutions', 'services', 'software', 'group',
])

// Two-letter keys ("ey", "xm") match too much of ordinary text to be trusted.
const MIN_KEY = 3

// A question rarely names more than a couple of employers; past three, the
// prompt would be mostly rows nobody asked about.
const MAX_NAMED = 3

export const words = (text) => String(text ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean)

// Greenhouse boards with no display name come through as their slug, run
// together: "Razorpaysoftwareprivatelimited". The long legal words are
// peeled off the end of the last word as well; the short ones are not, or
// "Cisco" would lose its "co".
const RUN_TOGETHER_TAIL = [
  'limited', 'private', 'software', 'technologies', 'technology', 'solutions', 'services', 'corporation', 'india', 'group',
]

function peel(word) {
  const tail = RUN_TOGETHER_TAIL.find((end) => word.endsWith(end) && word.length - end.length >= MIN_KEY)
  return tail ? peel(word.slice(0, -tail.length)) : word
}

export function companyKey(name) {
  const tokens = words(name)
  while (tokens.length > 1 && LEGAL_TAIL.has(tokens.at(-1))) tokens.pop()
  if (tokens.length) tokens.push(peel(tokens.pop()))
  return tokens.join(' ')
}

// The companies of `companies` the question names as whole words, one per
// key, the longest keys first so "Amazon Web Services" beats "Amazon".
export function companiesNamed(question, companies) {
  const asked = ` ${words(question).join(' ')} `
  const found = new Map()
  for (const name of companies) {
    const key = companyKey(name)
    if (key.length < MIN_KEY || COMMON_WORDS.has(key) || found.has(key) || !asked.includes(` ${key} `)) continue
    found.set(key, name)
  }
  return [...found].sort(([a], [b]) => b.length - a.length).slice(0, MAX_NAMED).map(([key, name]) => ({ key, name }))
}
