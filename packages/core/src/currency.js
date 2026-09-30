// Foreign boards quote pay in their own currency. Without conversion a
// "$60k - $80k" salary read as 60 rupees and sank below every Indian stipend,
// so pay is converted to INR before it becomes a comparable number.
//
// Rupees per unit of each currency. These are a hand-entered snapshot, not a
// live rate: they exist to keep a US salary and an Indian stipend in the same
// order of magnitude, and a few percent of drift does not change that order.
export const INR_PER = { INR: 1, USD: 85, EUR: 95, GBP: 110 }

// LPA, lakh, crore and CTC imply rupees even when no symbol appears. Word
// boundaries stop "rs" firing inside "years" and "usd" inside a company name.
const SIGNS = [
  ['INR', /₹|\brs\.?(?=\s|\d|$)|\binr\b|\blpa\b|\blakh|\blacs?\b|\bcrores?\b|\d\s*cr\b|\bctc\b/i],
  ['USD', /\$|\busd\b|\bdollars?\b/i],
  ['EUR', /€|\beuro?s?\b|\beur\b/i],
  ['GBP', /£|\bgbp\b|\bpounds?\b/i],
]

// 4,76,000 is Indian digit grouping, and no dollar figure is ever written that
// way. Some Indian boards still prefix a plain rupee amount with "$", so the
// grouping has to outrank the symbol: read as USD, one such posting converted
// to 404 LPA and topped every pay sort in the feed.
const INDIAN_GROUPING = /\d{1,2},\d{2},\d{3}/

// Indian boards quote bare numbers, so a text naming no currency reads as INR.
export function detectCurrency(text) {
  const s = String(text || '')
  if (INDIAN_GROUPING.test(s)) return 'INR'
  for (const [code, re] of SIGNS) if (re.test(s)) return code
  return 'INR'
}
