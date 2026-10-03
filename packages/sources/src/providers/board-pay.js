// Pay a board publishes as fields (Greenhouse's pay transparency ranges,
// Ashby's compensation, Lever's salary range), written as the pay text the
// store keeps: "INR 2,755,300 - 3,100,000 /year". The currency goes first
// by its code, so a dollar range stays dollars when core reads it, and a
// period the board did not give is left off rather than guessed. A range
// with no amount above zero is not pay.
const PERIODS = [[/hour/i, '/hour'], [/month/i, '/month'], [/year|annual|annum/i, '/year']]

const grouped = (n) => Math.round(n).toLocaleString('en-US')

export function payRange({ min, max, currency, period }) {
  const lo = Number(min)
  const hi = Number(max)
  const amounts = [lo, hi].filter((n) => Number.isFinite(n) && n > 0)
  if (!amounts.length) return null
  const low = Math.min(...amounts)
  const high = Math.max(...amounts)
  const span = low === high ? grouped(low) : `${grouped(low)} - ${grouped(high)}`
  const unit = PERIODS.find(([re]) => re.test(String(period || '')))?.[1]
  return [String(currency || '').toUpperCase(), span, unit].filter(Boolean).join(' ')
}

// A board's workplace field, as the one word core reads: Ashby's "OnSite",
// Lever's "on-site", either's "Remote" or "Hybrid". "unspecified" is none.
const MODES = [[/hybrid/i, 'hybrid'], [/remote/i, 'remote'], [/on-?site|office/i, 'onsite']]

export function workplace(value) {
  const mode = MODES.find(([re]) => re.test(String(value || '')))?.[1]
  return mode ? { workMode: mode } : {}
}
