import { contextAt } from './flag-context.js'

// Rule 1 of the fact check, the dates half. resume-numbers.js compares years
// as values, and a resume has many of them: an employment moved from 2023 to
// 2022 passed that check on the measurement fixture because a project and
// an award already sat in 2022. So a date is also compared as written, a
// month with its year ("Jul 2023", "07/2023") or a span of years ("2019 to
// 2023"), each of which must appear in the original under some spelling of
// the same month and the same separator.
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
// Whole month names or their usual short forms only: a looser "jan[a-z]*"
// read "Marketing 2022" as a March.
const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?'
const YEAR = '(?:19|20)\\d{2}'
const DATES = new RegExp(
  `\\b${MONTH}\\s+${YEAR}\\b|\\b(?:0?[1-9]|1[0-2])[/-]${YEAR}\\b|\\b${YEAR}\\s*(?:to|-|until|till)\\s*(?:${YEAR}|present|now|current)\\b`,
  'gi',
)

// "Sept 2023", "Sep. 2023", "September 2023" and "09/2023" are one date;
// "2019-2023" and "2019 to 2023" are one span.
function canon(text) {
  const numeric = /^(\d{1,2})[/-](\d{4})$/.exec(text)
  if (numeric) return `${MONTHS[Number(numeric[1]) - 1]} ${numeric[2]}`
  return text.toLowerCase().replace(/\./g, '')
    .replace(/[a-z]+/g, (w) => (/^(to|until|till)$/.test(w) ? 'to' : /^(present|now|current)$/.test(w) ? 'present' : w.slice(0, 3)))
    .replace(/\s*-\s*/, ' to ').replace(/\s+/g, ' ')
}

export function checkDates(original, tailored) {
  const known = new Set([...original.matchAll(DATES)].map((m) => canon(m[0])))
  const flags = []
  const seen = new Set()
  for (const m of tailored.matchAll(DATES)) {
    const date = canon(m[0])
    if (known.has(date) || seen.has(date)) continue
    seen.add(date)
    flags.push({ type: 'number', value: m[0], context: contextAt(tailored, m.index) })
  }
  return flags
}
