import { contextAt } from './flag-context.js'

// Rule 1 of the fact check: every number in the rewrite must already be in
// the original. Numbers are the easiest thing for a model to "improve" (a
// 35% that becomes 40%, a 2023 that becomes 2022, a team of 2 that becomes
// 5) and the hardest for a reader to notice, so they are compared as values,
// not strings: "1,00,000" in Indian grouping is 100000, "40 %" is 40, "two
// years" is 2 years, and "5 lakh" is both 5 and 500000.

// Digits not glued to a letter, so the 2 of "EC2" and the 3 of "S3" are a
// product name and not a figure. Commas only between digits, so the comma
// after "1,200 employees," is not swallowed.
const DIGITS = /(?<![A-Za-z\d])\d+(?:,\d+)*(?:\.\d+)?/g

// Written-out small numbers. "one" is left out: it is in every resume as a
// pronoun ("one of"), and would let any 1 in the rewrite pass unchecked.
const WORDS = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
}
const WORD_NUMBERS = /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/gi

// "k", "m" and "l" only when glued to the digits, as measures.js reads them,
// so the M of "6 Months" cannot inflate a figure; scale words may follow a
// space. cr and lakh are the forms Indian pay is quoted in.
const GLUED = /^([kml])(?![a-z])/i
const SCALE_WORDS = /^\s?(thousand|lakhs?|lacs?|crores?|cr|million|mn|billion|bn|%)(?![a-z])/i
const SCALE = {
  k: 1e3, m: 1e6, l: 1e5, thousand: 1e3, lakh: 1e5, lakhs: 1e5, lac: 1e5, lacs: 1e5,
  crore: 1e7, crores: 1e7, cr: 1e7, million: 1e6, mn: 1e6, billion: 1e9, bn: 1e9,
}

// Every figure in a text with the values it can stand for. `shown` is the
// figure with its unit as written, which is what a flag names.
export function readNumbers(text) {
  const out = []
  for (const m of text.matchAll(DIGITS)) {
    const raw = Number(m[0].replace(/,/g, ''))
    const rest = text.slice(m.index + m[0].length)
    const unit = (GLUED.exec(rest) || SCALE_WORDS.exec(rest))?.[0] || ''
    const scale = SCALE[unit.trim().toLowerCase()]
    out.push({ shown: `${m[0]}${unit}`, values: scale ? [raw, raw * scale] : [raw], index: m.index })
  }
  for (const m of text.matchAll(WORD_NUMBERS)) {
    out.push({ shown: m[0], values: [WORDS[m[0].toLowerCase()]], index: m.index })
  }
  return out
}

export function checkNumbers(original, tailored) {
  const known = new Set(readNumbers(original).flatMap((n) => n.values))
  const flags = []
  const seen = new Set()
  for (const n of readNumbers(tailored)) {
    if (n.values.some((v) => known.has(v))) continue
    // One flag per figure: the same invented 40% in two bullets is one thing
    // to check, and the first place it appears is where to start.
    if (seen.has(n.values[0])) continue
    seen.add(n.values[0])
    flags.push({ type: 'number', value: n.shown, context: contextAt(tailored, n.index) })
  }
  return flags
}
