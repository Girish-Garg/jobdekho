import { quote } from './tag.js'
import { sectionize, headingOf } from './jd-sections.js'

// What keeps a level word in prose from counting, shared by the readers in
// level-stated.js: a negation just before it ("not an entry-level role"), a
// sentence that names a second level, which makes it a range or a list
// ("from entry level to senior", "Senior/Principal", "freshers or
// experienced candidates"), and experience that is only wished for.

const NEGATION = /\b(?:not|no|never|nor|without|isn['’]?t|aren['’]?t|wasn['’]?t|won['’]?t|don['’]?t|doesn['’]?t)\b/i

// The words that name each level in a sentence.
const NAMES = {
  entry: /\b(?:entry[- ]?level|junior|jr\.?|freshers?|(?:fresh|recent|new) (?:college |university )?grad(?:uate)?s?|early[- ]career)\b/i,
  mid: /\b(?:mid[- ]?level|mid[- ]senior|intermediate)\b/i,
  senior: /\b(?:senior|sr\.?)\b/i,
  staff: /\b(?:staff|principal)\b/i,
}
const EVERY_LEVEL = /\b(?:all|any|every|various|different|multiple) (?:levels?|seniorit(?:y|ies)|experience levels)\b|\blevels of (?:seniority|experience)\b/i
// Beside a newcomer, an experienced hand makes a list ("freshers or
// experienced candidates"); beside a Staff Engineer it is only praise.
const EXPERIENCED = /\b(?:experienced|seasoned)\b/i

// A negation in the words, or in the last few before a match.
export const denies = (words) => NEGATION.test(words)
export const negated = (before) => denies(before.slice(-30))

export function namesOthers(sentence, level) {
  if (EVERY_LEVEL.test(sentence) || (level === 'entry' && EXPERIENCED.test(sentence))) return true
  return Object.entries(NAMES).some(([other, re]) => other !== level && re.test(sentence))
}

// Benefits and equal-opportunity copy speak of the company's roles in
// general ("our early career programmes"), not of this one. Copy labelled
// as the company's own is still read: a sentence that names the company
// ("Okta is seeking a Staff Application Developer") lands there, and so do
// requirements under a heading the sectioner does not know ("We are
// looking for:").
const SKIP = new Set(['benefits', 'eeo'])

// A Preferred or Nice to have heading marks everything under it as wished
// for. The sectioner also files a single line as nice when it merely
// mentions a preference, which would hide "Bachelors + 7 years ...
// Preferred Qualifications Varies"; so the heading is tracked here, and a
// line that names the heading only to leave it empty ("Good to have skills:
// NA") opens nothing.
const EMPTY_FIELD = /:\s*(?:n\/?a|none|nil|-)\s*$/i

// [{ text, section, wished }] for each sentence or bullet worth reading.
export function unitsOf(description, company) {
  let wished = false
  return sectionize(description, company).map((u) => {
    const head = headingOf(u.text)
    if (head && !head.weak && !EMPTY_FIELD.test(u.text)) wished = head.section === 'nice'
    return { ...u, wished }
  }).filter((u) => !SKIP.has(u.section))
}

// Experience a posting would like rather than asks never decides a level:
// "Prefer 2 years'", "3 years of planning ... will be added advantages", or
// anything under a Preferred or Nice to have heading. A heading run into the
// end of a requirement ("7 years of related experience Preferred
// Qualifications Varies") starts a new clause rather than spoiling it.
const OPTIONAL = /\b(?:prefer(?:red|ably|able|s)?|nice[- ]to[- ]have|good[- ]to[- ]have|added advantages?|(?:an|of) advantage|advantageous|a (?:big |huge |strong |definite )?plus|plus points?|bonus|desirable|optional)\b/i
const BOUNDARY = /[.;!?|•]+\s+|\s+(?=(?:Preferred|Desired) (?:Qualifications|Skills|Experience)\b|(?:Nice|Good)[- ]to[- ][Hh]ave\b)/g

// Whether the clause around a unit's index is only wished for.
export function optionalAt(unit, index) {
  if (unit.wished) return true
  let start = 0
  for (const m of unit.text.matchAll(BOUNDARY)) {
    if (index < m.index) return OPTIONAL.test(unit.text.slice(start, m.index))
    start = m.index + m[0].length
  }
  return OPTIONAL.test(unit.text.slice(start))
}

// The hover's words: the match with the start of its clause, so it reads
// "you'll step into an entry-level role" rather than a bare fragment.
export function saying(sentence, index, end) {
  const before = sentence.slice(0, index)
  let start = Math.max(before.lastIndexOf(','), before.lastIndexOf(';'), before.lastIndexOf(':')) + 1
  // A heading the board ran into the sentence ("ABOUT THE ROLE We're
  // looking for") is not part of what it says.
  start += (/^\s*(?:[A-Z][A-Z&']+\s+){2,}(?=[A-Z][a-z'’])/.exec(before.slice(start)) || [''])[0].length
  if (index - start > 40) start = index
  return `Says "${quote(sentence.slice(start, end).trim())}"`
}
