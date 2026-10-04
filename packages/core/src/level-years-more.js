import { levelForYears } from './level-years.js'
import { optionalAt } from './level-guards.js'

// Amounts of experience the strict reader (level-years.js) passes over, each
// tied to the word experience: words between the number and it ("3 years of
// hands-on experience", "5 years' relevant experience"), numbers in words
// ("three to five years of experience"), a label before it ("Exp Level 6Yrs
// to 9Yrs"), and ceilings ("up to 4 years", "less than 2 years"), which read
// from zero.
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, fifteen: 15 }
const N = `(\\d{1,2}|${Object.keys(WORDS).join('|')})`
const YEARS = "(?:years?|yrs?)(?:\\(s\\))?['’]?"
const TO_EXPERIENCE = "\\s*(?:of\\s+)?(?:[a-z][\\w/-]*\\s+){0,4}?(?:experience|exp\\b)"
const LABEL = "\\b(?:experience|exp)\\.?(?:\\s*level)?\\s*(?::|-|\\u2013)?\\s*(?:at least|minimum(?: of)?|min\\.?)?\\s*"
const DASH = '(?:to|-|\\u2013|\\u2014)'

const count = (n) => WORDS[n.toLowerCase()] ?? Number(n)
const plural = (n) => `${n} year${n === 1 ? '' : 's'}`
const range = (m) => ({ floor: count(m[1]), evidence: `Asks for ${count(m[1])} to ${count(m[2])} years` })

const FORMS = [
  [`\\b(up ?to|less than|under|not more than|at most)\\s+${N}\\s*${YEARS}${TO_EXPERIENCE}`,
    (m) => ({ floor: 0, evidence: `Asks for ${m[1].toLowerCase().replace('upto', 'up to')} ${plural(count(m[2]))}` })],
  [`\\b${N}\\s*(?:${YEARS}\\s*)?(?:${DASH}|and (?:a )?max(?:imum)?(?: of)?|and up ?to)\\s*${N}\\s*${YEARS}${TO_EXPERIENCE}`, range],
  [`${LABEL}${N}\\s*(?:${YEARS}\\s*)?${DASH}\\s*${N}\\s*${YEARS}`, range],
  [`(?:\\b${N}\\s*(\\+)?\\s*${YEARS}${TO_EXPERIENCE}|${LABEL}${N}\\s*(\\+)?\\s*${YEARS})`, (m) => {
    const n = count(m[1] ?? m[3])
    return { floor: n, evidence: `Asks for ${m[2] || m[4] ? `${n}+ years` : plural(n)}` }
  }],
].map(([source, read]) => ({ re: new RegExp(source, 'gi'), read }))

// Every amount in a sentence, in reading order.
const amountsIn = (text) => FORMS
  .flatMap(({ re, read }) => [...text.matchAll(re)].map((m) => ({ index: m.index, ...read(m) })))
  .sort((a, b) => a.index - b.index)

// More than twenty years is a company's age ("25 years of industry
// experience"), not what a role asks.
const MOST = 20

// "Master's degree and 1 year, Bachelor's degree and 3 years" and "M.Tech;
// or B.Tech with 2 years" give one amount per degree. Read only an amount
// that belongs to the bachelor's path, or to no degree at all: the first one
// alone called a role for graduates with three years entry level.
const BACHELOR = '\\b(?:bachelor[\'’]?s?|b\\.?\\s?tech|b\\.?\\s?sc?|undergraduate)\\b'
const HIGHER = '\\b(?:master[\'’]?s?|m\\.?\\s?tech|m\\.?\\s?sc?|mba|mca|ph\\.?\\s?d|doctorate|post-?graduate)\\b'
const DEGREE = new RegExp(`(${BACHELOR})|${HIGHER}`, 'gi')
const BOTH = [new RegExp(BACHELOR, 'i'), new RegExp(HIGHER, 'i')]

function otherPath(sentence, index) {
  if (!BOTH.every((re) => re.test(sentence))) return false
  const before = sentence.slice(0, index)
  const found = [...before.matchAll(DEGREE)]
  if (!found.length) return false
  // The degrees named together just before the amount share it:
  // "Master's or Bachelor's degree with a minimum of 4 years".
  let first = found.length - 1
  const joined = (a, b) => /^[\s/,'’]*(?:(?:or|and|&)[\s/]*)?$/i.test(before.slice(a.index + a[0].length, b.index))
  while (first > 0 && joined(found[first - 1], found[first])) first--
  if (!found.slice(first).some((m) => m[1])) return true
  return /[;,]\s*or\s+(?:an?\s+)?$/i.test(before.slice(0, found[first].index))
}

// { level, evidence, rule } for the first amount the units of { text,
// section, wished } ask for, or null. An amount only wished for is passed
// over.
export function moreYears(units) {
  for (const unit of units) {
    for (const hit of amountsIn(unit.text)) {
      if (hit.floor > MOST || optionalAt(unit, hit.index)) continue
      if (otherPath(unit.text, hit.index)) return null
      return { level: levelForYears(hit.floor), evidence: hit.evidence, rule: 'years' }
    }
  }
  return null
}
