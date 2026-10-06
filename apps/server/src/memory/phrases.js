import { cleanMemoryText, MAX_MEMORY_TEXT } from '@jobdekho/store/memory.js'
import { topicsOf, isSensitive } from './topics.js'

// A lasting preference the person states in their own message, found by how
// it is said ("from now on", "always", "I prefer"), so it is offered even
// when the AI's reply offered nothing. The words are the person's own
// sentence, lightly trimmed, and where it applies is read from its topics.
// A question is left alone, and so is a sensitive topic, which is kept only
// when the person says "remember" (remember.js).
const MARKERS = [
  /\bfrom now on\b/i, /\b(?:always|never|every time|whenever)\b/i,
  /\bi(?:'d| would)? prefer\b/i, /\bi(?:'m| am) only (?:looking|interested)\b/i,
  /\bi (?:only|just) want\b/i, /\bi (?:don'?t|do not) want\b/i, /\bi(?:'m| am) not interested in\b/i,
  /\bi(?:'m| am) (?:a |an )?(?:fresher|student|final[- ]year student|recent graduate)\b/i, /\bi (?:will )?graduate in\b/i,
  /\bmy notice period\b/i, /\bi (?:can'?t|cannot|won'?t|will not) relocate\b/i, /\bi(?:'m| am) open to\b/i,
  /\b(?:hamesha|kabhi nahi|sirf)\b/i,
]

// Words before the preference that are not part of it: fillers, "from now
// on", and a "remember that" whose words are the preference itself.
const LEAD = /^(?:(?:ok(?:ay)?|so|also|and|please|pls|hey|hi|btw)[,!.]?\s+)+/i
const NOW_ON = /^from now on,?\s+/i
const KEEP = /^(?:please\s+)?(?:remember|(?:don['’]?t|do\s+not)\s+forget|keep\s+in\s+mind|note)(?:\s+that)?[:,]?\s+/i

const JOB_TOPICS = ['pay', 'check', 'place', 'company', 'interview', 'experience']

// Where a preference applies, from what it is about.
export function scopeOf(text) {
  const topics = topicsOf(text)
  if (topics.has('resume')) return 'resume'
  if (topics.has('letter')) return 'letters'
  return JOB_TOPICS.some((name) => topics.has(name)) ? 'jobs' : 'everywhere'
}

// The person's own sentence as a memory: lead-ins and the end stop gone,
// a capital first, cut to what a memory can hold.
export function asMemory(sentence) {
  const bare = cleanMemoryText(sentence).replace(LEAD, '').replace(KEEP, '').replace(NOW_ON, '').replace(/[.!\s]+$/, '')
  return bare ? `${bare[0].toUpperCase()}${bare.slice(1)}`.slice(0, MAX_MEMORY_TEXT) : ''
}

// Whether words say something lasting, by how they are phrased.
export const isLasting = (text) => MARKERS.some((pattern) => pattern.test(text))

const sentencesOf = (message) => String(message ?? '').match(/[^.!?\n]+[.!?]?/g) ?? []

// [{ text, scope, quote, source: 'phrase' }], at most two a message.
export function spotPhrases(message) {
  const out = []
  for (const raw of sentencesOf(message)) {
    const sentence = raw.trim()
    if (out.length >= 2 || !sentence || sentence.endsWith('?')) continue
    if (!isLasting(sentence) || isSensitive(sentence)) continue
    const text = asMemory(sentence)
    if (text.length >= 4) out.push({ text, scope: scopeOf(text), quote: cleanMemoryText(sentence), source: 'phrase' })
  }
  return out
}
