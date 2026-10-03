import { tag } from './tag.js'
import { stipendMonthly } from './measures.js'
import { detectCurrency } from './currency.js'
import { payInText } from './pay-text.js'

// A pay text that names no amount but zero ("$0k - $0k") is a placeholder,
// not pay; one with no digits at all ("Competitive salary") is still the
// board's own words and is kept.
function boardPay(stipend) {
  const text = String(stipend ?? '').trim()
  if (!text) return null
  if (/unpaid|no stipend/i.test(text)) return text
  return /[1-9]/.test(text) || !/\d/.test(text) ? text : null
}

const fields = (text, payTag) => ({
  stipend: text,
  // stipendMin is monthly INR for sorting and filtering; currency records
  // what was quoted, so a dollar figure stays dollars wherever it shows.
  stipendMin: stipendMonthly(text),
  currency: detectCurrency(text),
  payTag,
})

// The pay fields of a posting: the board's pay field first, else pay its
// description states in so many words (see pay-text.js), else none.
export function payFields({ stipend = null, description = '' } = {}) {
  const board = boardPay(stipend)
  if (board) return fields(board, tag(board, 'board', `Pay field: ${board}`))
  const said = payInText(description)
  if (said) return fields(said.text, tag(said.text, 'text', `Says "${said.evidence}"`))
  return { stipend: null, stipendMin: null, currency: null, payTag: null }
}
