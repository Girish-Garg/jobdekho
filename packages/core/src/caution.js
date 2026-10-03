import { TEXT_FLAGS } from './caution-rules.js'
import { withoutNotices } from './caution-text.js'
import { isCareerSite, cardOnly } from './source-kind.js'

// Caution is for strict red flags only, each one a fact the posting states:
//
//   [{ code, reason, evidence }]
//
// codes: 'fee' (asks the applicant to pay), 'personal-email' (a free mail
// address as a company's contact), 'performance-pay' (pay stated only as
// performance-based) and 'shared-ad' (the same ad under several company
// names, which needs the whole corpus, see the store's shared-ads.js).
//
// A ghost-job rubric is the wrong tool: "no pay stated" alone describes 94%
// of postings, so it flagged Infosys, EY and Google and missed the stipend
// mills. A company's own careers site is never flagged: a fraudster cannot
// post there, and its anti-fraud notice is the most fee-shaped text it has.
export function cautionOf({ description = '', source = '', stipend = null } = {}) {
  if (isCareerSite(source)) return []
  const text = withoutNotices(description)
  return TEXT_FLAGS.map((rule) => rule(text, stipend)).filter(Boolean)
}

export const sharedAdFlag = (names) => ({
  code: 'shared-ad',
  reason: `The same ad appears under ${names.length} company names`,
  evidence: names.slice(0, 5).join(', '),
})

// A quiet note, not a warning: a posting whose own full text is very thin.
// Missing pay never counts toward it, an empty text is a fetch not yet made
// rather than an employer saying nothing, and a board that only ever gives
// a card's few lines is not judged by them.
export const FEW_WORDS = 60
const wordCount = (text) => String(text || '').split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length

export function fewDetails({ description = '', source = '' } = {}) {
  if (cardOnly(source)) return false
  const words = wordCount(description)
  return words > 0 && words < FEW_WORDS
}
