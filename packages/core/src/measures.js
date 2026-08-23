// Sources publish pay, tenure and experience as free text in incompatible
// units. These turn each into one comparable number so the database can filter
// and sort on them, instead of the browser guessing over whatever page it
// happens to have loaded.

// "6 LPA" means lakhs per annum, so a small number carries a 100000 multiplier.
const YEARLY = /year|annum|\bp\.?\s?a\.?\b|\blpa\b|\/\s?yr/i
const LAKHS = /\blpa\b|\blakh/i

// Normalised to monthly rupees so a yearly salary and a monthly internship
// stipend answer the same question. A range yields its LOW end, which is the
// only figure actually guaranteed. null means unknown, 0 means explicitly unpaid.
export function stipendMonthly(text) {
  if (!text) return null
  if (/unpaid|no stipend/i.test(text)) return 0
  const nums = String(text).replace(/,/g, '').match(/\d+(?:\.\d+)?/g)
  if (!nums) return null
  let value = Number(nums[0])
  if (LAKHS.test(text) && value < 1000) value *= 100000
  if (YEARLY.test(text)) value /= 12
  return Math.round(value)
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
