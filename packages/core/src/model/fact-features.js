import { content, pairs } from './tokens.js'

// What the facts model reads of one line of a description (see
// fact-estimate.js): its words, its word pairs and its first word, once
// the parts that differ from posting to posting are each put as one fixed
// word. An email address becomes the kind of address it is, never the
// address itself, so the weights hold no one's name: a desk for applying
// (careers@, hr@), a help desk (accessibility@, privacy@), a personal
// mailbox (gmail and the like) or any other. A clock time ("7 pm",
// "1.30pm"), a round-the-clock ("24x7", "24/7") and a link become one word
// each.
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/gi
const APPLY_DESK = /^(?:apply|applications?|careers?|jobs?|hiring|hr|recruit\w*|talent\w*|resumes?|cv|people|placements?)\b/i
const HELP_DESK = /^(?:accessib\w*|accommodat\w*|disabilit\w*|privacy|security|support|help\w*|no-?reply|legal|compliance|grievance|abuse|fraud|dpo|ethics|eeo)\b/i
const PERSONAL = /@(?:gmail|googlemail|yahoo|ymail|outlook|hotmail|live|rediffmail|icloud|protonmail)\./i

function addressWord(address) {
  const local = address.split('@')[0]
  if (HELP_DESK.test(local)) return ' zzhelpdesk '
  if (APPLY_DESK.test(local)) return ' zzapplydesk '
  return PERSONAL.test(address) ? ' zzpersonal ' : ' zzmailbox '
}

export function factText(line) {
  return String(line ?? '')
    .replace(EMAIL, addressWord)
    .replace(/https?:\/\/\S+|www\.\S+/gi, ' zzurl ')
    .replace(/\b24\s*[x×*/]\s*7(?:\s*[x×*/]\s*365)?\b/gi, ' zz247 ')
    .replace(/\b\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|noon)\b/gi, ' zztime ')
}

// Map of feature name to value: "w:" the line's words and word pairs, "f:"
// its first word. A list mark is not a word.
export function factFeatures(line) {
  const words = content(factText(line).replace(/^\s*[-*•·▪●]\s*/, ''))
  const names = new Set([...words, ...pairs(words)].map((w) => `w:${w}`))
  const features = new Map()
  const value = 1 / Math.sqrt(names.size || 1)
  for (const name of names) features.set(name, value)
  if (words[0]) features.set(`f:${words[0]}`, 0.5)
  return features
}
