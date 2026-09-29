import { normalizeJdText } from './fingerprint.js'

// The unit boilerplate is detected in (see boilerplate.js). A whole sentence
// recurring across postings is evidence of a template; a 3-token shingle
// recurring is not, since "experience with python and" is in every second
// ad. Pieces are cut BEFORE normalizeJdText runs on each, because that strips
// the punctuation the boundaries are made of.
//
// The boundaries are what the corpus actually contains: sentence punctuation,
// the closing-tag residue ("/p", "/li") that the Greenhouse strip leaves
// standing as bare tokens, bullet characters, and the "1. ... 2. ..." lists
// Internshala writes. The dash bullets are matched by code point.
//
// A line break is one too. Once stripHtml kept paragraphs and list items as
// lines, the "/p" residue that used to end an unpunctuated heading was gone,
// and "About us" would have run into the first sentence under it.
const BOUNDARY = /[.!?;:]+(?=\s|$)|\s\/[a-z0-9]+(?=\s|$)|\s[-*\u2022\u2013\u2014]\s|\s\d{1,2}[.)]\s|\n/gi

// Tag names left standing after the angle brackets went. Dropped from the
// sentence rather than split on, so "p strong About us /strong /p" from one
// board and a clean "About us" from another compare equal.
const TAG_RESIDUE = /^\/?(p|li|ul|ol|div|br|strong|em|span|b|i|h[1-6]|tr|td|th|table|tbody)$/

// Under four tokens a "sentence" is a heading ("Responsibilities") or a
// bullet stub, which recur in every ad without saying anything. Measured at
// 4 and at 6 tokens: 135 against 129 pairs at 0.92 and the same Canonical
// outcome, so the lower floor was kept to leave more of a short ad standing.
export const MIN_SENTENCE_TOKENS = 4

export function jdSentences(text) {
  const out = []
  for (const piece of String(text ?? '').split(BOUNDARY)) {
    const tokens = normalizeJdText(piece).split(' ').filter((t) => t && !TAG_RESIDUE.test(t))
    if (tokens.length >= MIN_SENTENCE_TOKENS) out.push(tokens.join(' '))
  }
  return out
}
