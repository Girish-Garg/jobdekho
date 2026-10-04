import { foldFlag } from '../jd-layout.js'
import { headingShaped } from './section-lines.js'

// Lines the section model never places, whatever it makes of them, since
// they are no section's content. Equal-opportunity and legal text reads
// like requirements to a word model (Unisys's equal-opportunity statement,
// Micron's "does not charge candidates any recruitment fees" both went
// there); a heading (Micron's "About Micron Technology, Inc.", the "Our
// Purpose" opening every Mastercard posting) or a piece broken off a
// sentence (Bristlecone's "Delivery team.") is not content at all. Left
// unsorted, a line opens the posting, or folds as company text where
// foldFlag folds it.
const NOTICE = /recruitment fees?|\b(?:does|do|will) not (?:charge|ask|request|collect|accept)|\bnever (?:charges?|asks?|requests?)\b|recruitment fraud|fraudulent|\bscams?\b|phishing|privacy (?:notice|policy|statement)|personal (?:data|information)|data protection|\bdiscriminat|\bdisabilit|\bveterans?\b|gender identity|sexual orientation|national origin|unsolicited|(?:recruitment|staffing) agenc|e-verify|drug[- ]free|child labou?r|complies with (?:all )?applicable laws/i
// A sentence opening on "And" or "But" goes on from the one before it.
const CONTINUES = /^(?:and|but|or|nor|so|yet)\b/i
const ENDED = /[.!?:;)]$/
const listed = (line) => /^- /.test(line ?? '')
const wordCount = (line) => line.replace(/^- /, '').split(/\s+/).filter(Boolean).length

export function neverPlaced(lines, i) {
  const line = lines[i]
  if (foldFlag(line, 'other', () => false) === 'eeo' || NOTICE.test(line) || headingShaped(line)) return true
  if (!listed(line)) return wordCount(line) <= 3 || CONTINUES.test(line)
  // A dash inside a sentence ("its Cloud Development - Delivery team.")
  // cuts it like a bullet: a short item after an unfinished sentence is
  // that sentence's end.
  const prev = lines[i - 1]
  return wordCount(line) <= 4 && prev !== undefined && !listed(prev) && !ENDED.test(prev.trim()) && wordCount(prev) >= 6
}
