import { stipendMonthly } from './measures.js'
import { detectCurrency } from './currency.js'
import { sentenceAt } from './text-layout.js'
import { quote } from './tag.js'

// Pay a description states, read only in shapes that cannot be anything
// else: a currency beside a figure ("₹4,408,400 INR", "INR 7.4m - 9.8m",
// "$80k - $150k") in a sentence that talks about pay, or a figure in LPA.
// Pay is never guessed: a figure that is not plainly pay is left alone.
const CUR = '(?:\\u20b9|rs\\.?|inr|us\\$|\\$|usd|\\u20ac|eur|\\u00a3|gbp)'
const NUM = '\\d{1,3}(?:,\\d{2,3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?'
const UNIT = '(?:k|mn|m|million|lpa|lakhs?|lacs?|l|crores?|cr)(?![a-z])'
const ONE = `${CUR}\\s?(?:${NUM})(?:\\s?${UNIT})?`
const TO = '\\s*(?:-|to|\\u2013|\\u2014)\\s*'
const MONEY = new RegExp(`(?<![\\w$])${ONE}(?:${TO}(?:${CUR}\\s?)?(?:${NUM})(?:\\s?${UNIT})?)?(?:\\s?(?:inr|usd)\\b)?`, 'gi')
const LPA = /(?<![\w.])\d{1,2}(?:\.\d+)?\s*(?:(?:-|to|\u2013)\s*\d{1,2}(?:\.\d+)?\s*)?(?:lpa|lakhs? per annum|lakhs? p\.?a\.?)(?![a-z])/gi

const PAY_WORDS = /\b(?:salary|stipend|pay|compensation|ctc|package|remuneration|base|ote|wages?|earn\w*)\b/i
// Money that is not the job's pay: a company's funding, a fee, a prize.
const NOT_PAY = /\b(?:raised|funding|funded|valuation|revenue|turnover|arr|series [a-e]|investors?|market cap|billions?|worth|loans?|disburs\w*|aum|assets|transactions?|gmv|users|customers|budget|fees?|deposit|prizes?|rewards?|scholarships?|grants?)\b/i

const PERIODS = [
  ['/year', /\b(?:per annum|p\.?\s?a\b|annual(?:ly)?|per year|a year|yearly|lpa|ctc)\b|\/\s?(?:year|yr|annum)\b/i],
  ['/month', /\b(?:per month|a month|monthly|p\.?\s?m\b|stipend)\b|\/\s?(?:month|mo)\b/i],
  ['/hour', /\b(?:per hour|an hour|hourly)\b|\/\s?(?:hour|hr)\b/i],
]
// A day or week rate has no honest monthly figure.
const SHORT_RATE = /\b(?:per day|a day|daily|per week|a week|weekly)\b|\/\s?(?:day|week|wk)\b/i

// Monthly rupees a real job could pay: a thousand a month to a crore. A
// foreign figure under the higher floor is a perk ("Monthly Stipend: USD
// $150 via a Brex Card" is a home-office allowance), not a salary.
const SANE = [1000, 1e7]
const FOREIGN_FLOOR = 50000
// "Up to ₹10,000" promises nothing: it is a ceiling, and pay is never guessed.
const CEILING = /(?:up\s?to|upto|max(?:imum)?(?:\s+of)?|as high as)\s*$/i

// A figure on a line of its own takes its words from the label above it:
// Coinbase prints "Annual base salary range (excluding equity and bonus):"
// and the amount on the next line.
function previousLine(text, index) {
  const lines = text.slice(0, text.lastIndexOf('\n', index) + 1).split('\n').filter((l) => l.trim())
  return lines.at(-1) ?? ''
}

function candidate(text, m, needsWord) {
  const own = sentenceAt(text, m.index)
  const sentence = PAY_WORDS.test(own) ? own : `${previousLine(text, m.index)} ${own}`.trim()
  if ((needsWord && !PAY_WORDS.test(sentence)) || NOT_PAY.test(sentence) || SHORT_RATE.test(sentence)) return null
  if (CEILING.test(text.slice(Math.max(0, m.index - 20), m.index))) return null
  const words = m[0].replace(/\s+/g, ' ').trim()
  // "12 LPA" already says a year; anything else takes the sentence's period.
  const period = PERIODS.some(([, re]) => re.test(words)) ? null : PERIODS.find(([, re]) => re.test(sentence))?.[0]
  const stated = period ? `${words} ${period}` : words
  const monthly = stipendMonthly(stated)
  const floor = detectCurrency(stated) === 'INR' ? SANE[0] : FOREIGN_FLOOR
  if (!(monthly >= floor && monthly <= SANE[1])) return null
  return { text: stated, evidence: quote(sentence, 120) }
}

// { text, evidence } for the first pay the text states, or null. `text` is
// what the pay field stores, with the period when the sentence gives one.
export function payInText(description) {
  const text = String(description || '')
  if (!/\d/.test(text)) return null
  for (const [re, needsWord] of [[MONEY, true], [LPA, false]]) {
    for (const m of text.matchAll(re)) {
      const found = candidate(text, m, needsWord)
      if (found) return found
    }
  }
  return null
}
