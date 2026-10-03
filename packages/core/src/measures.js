import { detectCurrency, INR_PER } from './currency.js'
import { payFigure } from './pay-figure.js'

// Sources publish pay, tenure and experience as free text in incompatible
// units. These turn each into one comparable number so the database can filter
// and sort on them, instead of the browser guessing over whatever page it
// happens to have loaded.

// CTC, cost to company, is how an Indian offer states a year's pay, and
// "annually" was once missed, so "INR 12,00,000 annually" read as a month.
const YEARLY = /year|annum|annual|\bp\.?\s?a\.?\b|\blpa\b|\bctc\b|\/\s?yr/i
const MONTHLY = /month|\/\s?mo\b|stipend|\bp\.m\b/i

// "$14/hour" is not 14 a month. Contract and US listings quote an hourly rate,
// and reading it as a monthly figure buried every one of them at the bottom of
// a pay sort. A full-time month is about 160 working hours.
const HOURLY = /\/\s?h(?:ou)?r\b|per hour|hourly|\bp\.?h\.?\b/i
const HOURS_PER_MONTH = 160

// A bare rupee figure is a monthly stipend on the Indian boards ("10000"), but
// from a lakh up it is a year's salary (Unstop's jobs send "Rs 600000"): an
// internship paying a lakh a month would say so.
const ANNUAL_FROM = 100000

// Normalised to monthly rupees so a yearly salary and a monthly internship
// stipend answer the same question. A range yields its LOW end, which is the
// only figure actually guaranteed. null means unknown, 0 means explicitly unpaid.
//
// A stated period decides first, yearly over monthly. Otherwise lakhs, crores
// and millions mean a year ("1.2 Cr", "₹2.2M"), foreign boards quote annual
// salaries without saying so, and a bare rupee figure is monthly below a lakh.
// The hourly check comes before all of it: an hourly rate is neither.
// A zero that is not "unpaid" is a board's placeholder: RemoteOK rounds an
// unset salary to "$0k - $0k", which read as unpaid and sank to the bottom
// of every pay sort.
export function stipendMonthly(text) {
  if (!text) return null
  if (/unpaid|no stipend/i.test(text)) return 0
  const figure = payFigure(text)
  if (!figure || figure.value === 0) return null
  const currency = detectCurrency(text)
  const rate = INR_PER[currency]
  if (HOURLY.test(text)) return Math.round(figure.value * HOURS_PER_MONTH * rate)
  const annual = figure.annual || currency !== 'INR' || figure.value >= ANNUAL_FROM
  const monthly = !YEARLY.test(text) && (MONTHLY.test(text) || !annual)
  return Math.round((monthly ? figure.value : figure.value / 12) * rate)
}

export function experienceYears(text) {
  if (!text) return null
  if (/fresher|no experience|entry.level/i.test(text)) return 0
  const m = String(text).match(/\d+/)
  return m ? Number(m[0]) : null
}

export function durationMonths(text) {
  if (!text) return null
  const t = String(text).toLowerCase()
  const month = t.match(/(\d+)\s*month/)
  if (month) return Number(month[1])
  const year = t.match(/(\d+)\s*year/)
  if (year) return Number(year[1]) * 12
  const week = t.match(/(\d+)\s*week/)
  if (week) return Math.max(1, Math.round(Number(week[1]) / 4))
  return null
}
