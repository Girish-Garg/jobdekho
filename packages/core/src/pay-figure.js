// The first figure in a pay text and the unit it is written in. Indian pay is
// written in lakhs and crores as often as in digits ("8L - 12L", "1.2 Cr",
// "12 LPA"), and international pay in thousands and millions ("$60k",
// "₹2.2M"), so the unit decides the figure as much as the digits do.
const SCALE = { k: 1e3, thousand: 1e3, l: 1e5, lpa: 1e5, lakh: 1e5, lac: 1e5, cr: 1e7, crore: 1e7, m: 1e6, mn: 1e6, million: 1e6 }

// Lakhs, crores and millions are how annual pay is quoted. Nobody writes a
// monthly stipend as "0.15 L", so these units say "a year" on their own.
const ANNUAL_UNITS = new Set(['l', 'lpa', 'lakh', 'lac', 'cr', 'crore', 'm', 'mn', 'million'])

// A unit counts only when it ends there: the "M" of "6 Months" and the "L"
// of "12 Locations" are the start of a word, not a unit. A number never ends
// inside a longer one, so "15000INR" is 15000 rather than 1500.
const FIGURE = /(\d+(?:\.\d+)?)(?![\d.])(?:\s*(thousand|lpa|lakhs?|lacs?|l|crores?|crs?|million|mn|m|k)(?![a-z]))?/gi

function unitOf(word) {
  const unit = String(word || '').toLowerCase().replace(/s$/, '')
  return SCALE[unit] ? unit : null
}

// A range often names its unit once, after its high end ("12 - 15 L",
// "0.8 - 1.2 Cr", "12-18 LPA"), so a small first figure takes the unit the
// text names elsewhere. A large one already is the whole amount.
function borrowedUnit(text, figures) {
  const named = figures.map((f) => unitOf(f[2])).find(Boolean)
  if (named) return named
  if (/\blpa\b|\blakhs?\b|\blacs?\b/i.test(text)) return 'lakh'
  return /\bcrores?\b/i.test(text) ? 'crore' : null
}

// Every figure in a pay text, as { value, annual }, each read as the first
// one is: "$80k - $150k" is two figures and "12 - 15 L" two lakh figures.
export function payFigures(text) {
  const clean = String(text || '').replace(/,/g, '')
  const figures = [...clean.matchAll(FIGURE)]
  return figures.map((f) => {
    const number = Number(f[1])
    const unit = unitOf(f[2]) ?? (number < 1000 ? borrowedUnit(clean, figures) : null)
    return { value: number * (unit ? SCALE[unit] : 1), annual: ANNUAL_UNITS.has(unit) }
  })
}

// { value, annual } for the first figure (the low end of a range, the only
// amount actually promised), or null when the text holds no number.
export const payFigure = (text) => payFigures(text)[0] ?? null
