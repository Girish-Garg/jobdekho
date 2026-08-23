import { detectCurrency, INR_PER } from './currency.js'

// Sources publish pay, tenure and experience as free text in incompatible
// units. These turn each into one comparable number so the database can filter
// and sort on them, instead of the browser guessing over whatever page it
// happens to have loaded.

// "6 LPA" means lakhs per annum, so a small number carries a 100000 multiplier.
const YEARLY = /year|annum|\bp\.?\s?a\.?\b|\blpa\b|\/\s?yr/i
const MONTHLY = /month|\/\s?mo\b|stipend/i
const LAKHS = /\blpa\b|\blakh/i

// "$60k" is 60000, not 60. Only a suffix glued to the digits counts, so the
// "M" of "6 Months" cannot inflate a number.
const SCALE = { k: 1e3, m: 1e6 }

// "$14/hour" is not 14 a month. Contract and US listings quote an hourly rate,
// and reading it as a monthly figure buried every one of them at the bottom of
// a pay sort. A full-time month is about 160 working hours.
const HOURLY = /\/\s?h(?:ou)?r\b|per hour|hourly|\bp\.?h\.?\b/i
const HOURS_PER_MONTH = 160

// Normalised to monthly rupees so a yearly salary and a monthly internship
// stipend answer the same question. A range yields its LOW end, which is the
// only figure actually guaranteed. null means unknown, 0 means explicitly unpaid.
export function stipendMonthly(text) {
  if (!text) return null
  if (/unpaid|no stipend/i.test(text)) return 0
  const m = String(text).replace(/,/g, '').match(/(\d+(?:\.\d+)?)([km])?/i)
  if (!m) return null
  let value = Number(m[1]) * (SCALE[(m[2] || '').toLowerCase()] || 1)
  if (LAKHS.test(text) && value < 1000) value *= 100000
  const currency = detectCurrency(text)
  // Checked before the yearly rule: an hourly rate is neither yearly nor
  // monthly, and the "no stated period means yearly" fallback below would
  // otherwise divide it by twelve.
  if (HOURLY.test(text)) return Math.round(value * HOURS_PER_MONTH * INR_PER[currency])
  // Foreign boards quote annual salaries even when they never say so; Indian
  // boards quote bare numbers as monthly stipends. So a foreign figure with no
  // stated period reads as yearly, and a bare rupee figure stays monthly.
  if (YEARLY.test(text) || (currency !== 'INR' && !MONTHLY.test(text))) value /= 12
  return Math.round(value * INR_PER[currency])
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
