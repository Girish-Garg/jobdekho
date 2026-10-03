import { payFigures } from './pay-figure.js'
import { detectCurrency } from './currency.js'

// Pay in one short form wherever it shows (the feed's row, a card, the job
// pane, the chat): ₹4L/yr, ₹15k/mo, ₹1.2 Cr/yr, $80k to $150k/yr. One
// formatter, so a card cannot read "₹4L/yr" while the pane prints "400000",
// and a dollar figure never wears a rupee sign. A range says "to".
const SIGN = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }

const YEARLY = /year|annum|annual|\bp\.?\s?a\.?\b|\blpa\b|\bctc\b|\/\s?yr/i
const MONTHLY = /month|\/\s?mo\b|stipend|\bp\.m\b/i
const HOURLY = /\/\s?h(?:ou)?r\b|per hour|hourly/i

// One decimal, only where it says something: 4.5L earns its point, 4.0L not.
const short = (n) => {
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}
const rupees = (n) => (n >= 1e7 ? `${short(n / 1e7)} Cr` : n >= 1e5 ? `${short(n / 1e5)}L` : n >= 1e3 ? `${short(n / 1e3)}k` : short(n))
const foreign = (n) => (n >= 1e6 ? `${short(n / 1e6)}M` : n >= 1e3 ? `${short(n / 1e3)}k` : short(n))

// Stated first; else lakhs, crores and millions, a foreign salary, or a
// rupee figure from a lakh up are a year's pay, and a smaller one a month's.
function periodOf(text, figures, currency) {
  if (HOURLY.test(text)) return '/hr'
  if (YEARLY.test(text)) return '/yr'
  if (MONTHLY.test(text)) return '/mo'
  const annual = figures.some((f) => f.annual) || currency !== 'INR' || figures[0].value >= 1e5
  return annual ? '/yr' : '/mo'
}

// The short form of a pay text, 'Unpaid', or null when it names no amount.
export function payLabel(text, currency = detectCurrency(text)) {
  const t = String(text || '').trim()
  if (!t) return null
  if (/unpaid|no stipend/i.test(t)) return 'Unpaid'
  const figures = payFigures(t).filter((f) => f.value > 0)
  if (!figures.length) return null
  const sign = SIGN[currency] ?? ''
  const amount = (n) => `${sign}${currency === 'INR' ? rupees(n) : foreign(n)}`
  const values = figures.map((f) => f.value)
  const [lo, hi] = [Math.min(...values), Math.max(...values)]
  const span = lo === hi ? amount(lo) : `${amount(lo)} to ${amount(hi)}`
  return `${span}${periodOf(t, figures, currency)}`
}
