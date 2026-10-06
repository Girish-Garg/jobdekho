import { cleanMemoryText } from '@jobdekho/store/memory.js'
import { asMemory, scopeOf, isLasting } from './phrases.js'

// What an explicit "remember ..." asks to keep, read from the person's own
// words, for a turn whose reply offered nothing to save: "remember" is
// unmistakable (see chat/memory-command.js), so it is never lost. The words
// may come after the command ("remember that I'm a fresher") or before it
// ("I only want remote roles, remember that").
const AFTER = [
  /\bremember(?:\s+that)?[:,]?\s+(.+)/i,
  /\b(?:don['’]?t|do\s+not)\s+forget(?:\s+that)?[:,]?\s+(.+)/i,
  /\bkeep(?:\s+(?:this|that|it))?\s+in\s+mind(?:\s+that)?[:,]?\s+(.+)/i,
  /\bnote(?:\s+(?:this|that|it))?\s+down[:,]?\s+(.+)/i,
  /\b(?:add|save)\s+(?:this|that|it)\s+to\s+(?:your\s+|my\s+)?memory[:,]?\s+(.+)/i,
]
const COMMAND = /(?:please\s+)?(?:remember(?:\s+(?:this|that|it))?|(?:don['’]?t|do\s+not)\s+forget(?:\s+(?:this|that|it))?|keep\s+(?:this|that|it)\s+in\s+mind|note\s+(?:this|that|it)\s+down|(?:add|save)\s+(?:this|that|it)\s+to\s+(?:your\s+|my\s+)?memory)[.!]*$/i
const ONLY_A_POINTER = /^(?:this|that|it)$/i

function wordsOf(message) {
  const text = cleanMemoryText(message)
  for (const pattern of AFTER) {
    const after = pattern.exec(text)?.[1]
    if (after && !ONLY_A_POINTER.test(after.replace(/[.!]+$/, '').trim())) return after
  }
  const before = text.replace(COMMAND, '').replace(/[\s,;:]+$/, '')
  return before && before !== text ? before : ''
}

// "Remember to show me jobs at Infosys" asks for something now, not a
// preference to keep; "remember to always show the pay" is one, and keeps
// its words without the "to".
const TO = /^to\s+/i

// { text, scope, quote, source: 'remember' }, or null when the message says
// "remember" without anything lasting to remember.
export function rememberedLine(message) {
  let words = cleanMemoryText(wordsOf(message))
  if (TO.test(words)) {
    if (!isLasting(words)) return null
    words = words.replace(TO, '')
  }
  const text = asMemory(words)
  return text.length >= 4 ? { text, scope: scopeOf(text), quote: words, source: 'remember' } : null
}
